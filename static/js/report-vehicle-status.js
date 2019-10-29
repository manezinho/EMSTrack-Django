import { LeafletPolylineWidget } from "./leaflet/LeafletWidget";

import {addAmbulanceRoute, breakSegments, calculateMotionStatistics} from "./map-tools";

import { logger } from './logger';

let map;
let apiClient;
const vehicles = {};

// add initialization hook
add_init_function(init);

// setdates
function validateDateRange(beginDate, endDate) {

    // beginDate
    if (beginDate === null) {
        beginDate = new Date();
        beginDate.setHours(0, 0, 0, 0);
    } else
        beginDate = new Date(beginDate);

    // minDate
    let minDate = new Date();
    minDate.setDate(beginDate.getDate()+1);
    minDate.setHours(0, 0, 0, 0);

    // endDate
    if (endDate === null) {
        endDate = minDate;
    } else {
        endDate = new Date(endDate);
    }

    // make sure endDate > beginDate
    if (endDate <= beginDate) {
        endDate = new Date(minDate);
    }

    logger.log('debug', 'beginDate = %s, minDate = %s, endDate = %s', beginDate, minDate, endDate);

    return [beginDate, minDate, endDate];
}

function segmentHistory(history, byStatus, byUser) {

    byStatus = byStatus || true; // split by status
    byUser = byUser || false;     // split by user

    const segments = [];
    const durations = [];
    const status = [];
    const user = [];

    let currentSegment = [];
    let lastPosition = null;
    const n = history.length;
    for (let i = 0; i < n; i++) {

		// current position
        const currentPosition = history[i];

        // distance?
		if (lastPosition != null) {

            let newUser = false;
            let newStatus = false;

            if (byUser && lastPosition.updated_by_username !== currentPosition.updated_by_username) {
			    newUser = true;
            }

            if (!newUser && byStatus && lastPosition.status !== currentPosition.status) {
			    newStatus = true;
			    // will break segment, add current position first
                const newCurrentPosition = Object.assign({}, currentPosition);
                newCurrentPosition.status = lastPosition.status;
                currentSegment.push(newCurrentPosition);
            }

			if (newUser || newStatus) {
                // terminate current segment, sorted in reverse order!
                durations.push(
                    new Date(currentSegment[0].timestamp) -
                    new Date(currentSegment[currentSegment.length-1].timestamp)
                );  // in miliseconds
                segments.push(currentSegment);
                status.push(lastPosition.status);
                user.push(lastPosition.updated_by_username);
                currentSegment = [];
            }
		}

		// add position to segment
		currentSegment.push(currentPosition);

		// update lastPosition
		lastPosition = currentPosition;

	}

	// anything left?
	if (currentSegment.length > 0) {
        // terminate last segment
        durations.push(
            new Date(currentSegment[0].timestamp) -
            new Date(currentSegment[currentSegment.length-1].timestamp)
        );  // in miliseconds
        segments.push(currentSegment);
        status.push(lastPosition.status);
        user.push(lastPosition.updated_by_username);
    }

	return [segments, durations, status, user];

}

// initialization function
function init (client) {

    logger.log('info', '> report-vehicle-status.js');

    // set apiClient
    apiClient = client;

    // get parameters
    const urlParams = new URLSearchParams(window.location.search);

    // set beginDate
    const [beginDate, minDate, endDate] = validateDateRange(urlParams.get('beginDate'), urlParams.get('endDate'));
    logger.log('debug', 'beginDate = %s, minDate = %s, endDate = %s', beginDate, minDate, endDate);

    // set datepickers
    $('#beginDate')
        .prop('value', beginDate.toISOString().substr(0, 10))
        .change(function() {

            logger.log('debug', 'beginDate has changed!');

            const endDateElement = $('#endDate');
            const endDate = new Date(endDateElement.val());
            const beginDate = $( this ).val();
            logger.log('debug', 'beginDate = %s, endDate = %s', beginDate, minDate, endDate);

            const [_beginDate, _minDate, _endDate] = validateDateRange(beginDate, endDate);
            logger.log('debug', '_beginDate = %s, _minDate = %s, _endDate = %s', _beginDate, _minDate, _endDate);

            // replace endDate if necessary
            if (_endDate > endDate)
                endDateElement
                    .prop('value', _endDate.toISOString().substr(0, 10));

            // replace min on endDateElement
            endDateElement
                .prop('min', _minDate.toISOString().substr(0, 10));

        });

    $('#endDate')
        .prop('value', endDate.toISOString().substr(0, 10))
        .prop('min', minDate.toISOString().substr(0, 10));

    // set range
    const range = beginDate.toISOString() + "," + endDate.toISOString();
    logger.log('debug', 'range = %j', range)

    // Retrieve vehicles
    apiClient.httpClient.get('ambulance/')
        .then( response => {

            // retrieve vehicles
            logger.log('debug', "Got vehicle data from API");

            // loop through vehicle records
            const requests = response.data.map( vehicle  => {

                logger.log('debug', 'Adding vehicle %s', vehicle['identifier']);

                // save vehicle
                vehicles[vehicle['id']] = vehicle;
                vehicles[vehicle['id']]['history'] = [];

                const url = 'ambulance/' + vehicle['id'] + '/updates/?filter=' + range;
                return apiClient.httpClient.get(url);

            });

            return Promise.all(requests);

        })
        .then( responses =>
            responses.forEach(
                response => {

                    // retrieve updates
                    const updates = response.data;
                    if (updates.length) {
                        const id = updates[0]['ambulance_id'];
                        vehicles[id]['history'] = updates;

                    }

                }
        ))
        .then( () => {

            // add time scale to table
            let cursor = 0;
            let progress = '<div class="progress">\n';
            const totalTime = endDate.getTime() - beginDate.getTime();
            const numberOfHours = Math.floor(totalTime / 1000 / 60 / 60);
            const delta = 100 * (1000 * 60 * 60 / totalTime);
            const labels = ['secondary', 'light'];
            for (let i = 0; i < numberOfHours; i++) {
                progress += `<div class="progress-bar bg-${labels[i % 2]} text-${labels[(i + 1) % 2]}" role="progressbar" style="width: ${delta}%" aria-valuenow="${delta}" aria-valuemin="0" aria-valuemax="100">${i+1}</div>\n`;
            }
            progress += '</div>';
            logger.log('debug', 'progress = %s', progress);

            $('#vehiclesTable').append(
`<div class="row">
  <div class="col-2">
    <strong>Time</strong>
  </div>
  <div class="col-10">
    ${progress}
  </div>
 </div>`);

            // add vehicles to table
            for (const vehicle of Object.values(vehicles)) {

                // get history
                const history = vehicle['history'];

                if (history.length === 0) {
                    // add empty row
                    $('#vehiclesTable').append(
`<div class="row">
  <div class="col-2">
    <strong>${vehicle['identifier']}</strong>
  </div>
  <div class="col-10">
  </div>
 </div>`);
                    continue;

                }

                // segment by status
                const [segments, durations, status, user] = segmentHistory(history, true, false);

                // calculate offsets, sorted in reverse order!
                const n = status.length;
                const offsets = new Array(n);
                for (let i = 0; i < n; i++) {
                    const segment = segments[i];
                    offsets[i] = (new Date(segment[segment.length-1].timestamp)).getTime() - beginDate.getTime();
                }

                let cursor = 0;
                let progress = '<div class="progress">\n';
                for (let i = n - 1; i >= 0; i--) {
                    // advance bar until start
                    const start = 100 * (offsets[i] / totalTime);
                    logger.log('debug', 'start', start);
                    if (start > cursor) {
                        const delta = (start - cursor).toFixed(0);
                        progress += `<div class="progress-bar bg-light" role="progressbar" style="width: ${delta}%" aria-valuenow="${delta}" aria-valuemin="0" aria-valuemax="100">${delta}</div>\n`;
                        cursor = start;
                        logger.log('debug', 'delta', delta);
                    }
                    // fill barr with fraction
                    const fraction = (100 * (durations[i] / totalTime)).toFixed(0);
                    progress += `<div class="progress-bar bg-primary" role="progressbar" style="width: ${fraction}%" aria-valuenow="${fraction}" aria-valuemin="0" aria-valuemax="100">${fraction}</div>\n`;
                    cursor += fraction;
                    logger.log('debug', 'fraction', fraction);
                    logger.log('debug', 'cursor', cursor);
                }
                progress += '</div>';
                logger.log('debug', 'progress = %s', progress);

                $('#vehiclesTable').append(
`<div class="row">
  <div class="col-2">
    <strong>${vehicle['identifier']}</strong>
  </div>
  <div class="col-10">
    ${progress}
  </div>
 </div>`);

            }

            // enable geneate report button
            $('#submitButton')
                .prop('disabled', false);

        })
        .catch( (error) => {
            logger.log('error', "'Failed to retrieve vehicles: %s ", error);
        });

}

$(function () {

});
