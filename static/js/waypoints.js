/**
 * Waypoint base class
 */

import { logger } from "./logger";

import { Location } from './location';

import { swap } from './util';

export class Waypoint {

    constructor(parameters) {
        const properties = Object.assign({...Waypoint.default}, parameters);

        this.id = properties.id;
        this.order = properties.order;
        this.status = properties.status;
        this.location = new Location(properties.location);
    }

    renderStatusForm(label, classes) {

        // language=HTML
        const top = `<div class="dropdown ${classes}"
    id="waypoint-${label}-status-menu">
    <button class="btn btn-outline-dark btn-sm dropdown-toggle" type="button" 
            id="waypoint-${label}-status-menu-button" 
            data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span id="waypoint-${label}-status-menu-button-label">${waypoint_status[this.status]}</span>
    </button>
    <div class="dropdown-menu" aria-labelledby="waypoint-${label}-status-menu-button">`;

        let middle = '';
        waypoint_status_order.forEach( (status) => {
            middle += `        <a class="dropdown-item small"
        id="waypoint-${label}-status-${status}-menu-item" 
        href="#">${waypoint_status[status]}</a>`;
        });

        // language=HTML
        const bottom = `    </div>
</div>`;

        return top + middle + bottom;
    }

    render(label, options = ['status-span', 'type-dropdown', 'address-div']) {

        // language=HTML
        let html = `<ul id="waypoint-${label}-${this.order}-form" class="list-group">  
    <input id="waypoint-${label}-id" 
           name="id"           
           type="hidden" 
           value="${this.id}">    
    <input id="waypoint-${label}-order"
           name="order"
           type="hidden"
           class="form-control form-control-sm"  
           value="${this.order}">
    <li id="waypoint-${label}-item-type" class="list-group-item px-10">
        <em>${translation_table['Type']}:</em>`;

        // type
        if (options.includes('type-dropdown'))
            html += this.location.render(label, "dropleft float-right", "type-dropdown");
        else // if (options.includes('type-span'))
            html += `<span class="float-right">${location_type[this.location.type]}</span>`;

        html += `    </li>
    <li id="waypoint-${label}-item-status" class="list-group-item px-10">
        <em>${translation_table['Status']}:</em>`;

        // status
        if (options.includes('status-dropdown'))
            html += this.renderStatusForm(label, "dropleft float-right");
        else // if (options.includes('status-span'))
            html += `<span class="float-right">${waypoint_status[this.status]}</span>`;

        html += `    </li>
    <li id="waypoint-${label}-item-address" class="list-group-item px-10">
        ${this.location.render(label)}
    </li>
</ul>`

        return html;

    }

    postRender(label, options = ['status-span', 'type-dropdown', 'address-div']) {

        if (options.includes('status-dropdown'))
            $(`#waypoint-${label}-status-menu a`)
                .click( function() {

                    // copy to label
                    $(`#waypoint-${label}-status-menu-button-label`)
                        .text($(this).text());

                });

        this.location.postRender(label, options);

    }

}

Waypoint.default = {
    id: null,
    order: -1,
    status: 'C',
    location: new Location()
};


export class Waypoints {
    
    constructor(waypoints = [], label = 'new', placeholder = '#waypoints') {
        this.waypoints = waypoints.map(obj => new Waypoint(obj));
        this.activeIndex = (waypoints.length > 0 ? 0 : -1);
        this.label = label;
        this.placeholderName = placeholder;

        // convert to waypoint and calculate maxOrder
        this.maxOrder = 0;
        for (const waypoint of this.waypoints) {
            this.maxOrder = ( this.maxOrder > waypoint.order ? this.maxOrder : waypoint.order );
        }

    }

    render() {

        // create placeholder selector
        this.placeholder = $(this.placeholderName);

        this.placeholder.html(`
<div id="call-${this.label}-carousel" class="carousel slide" data-ride="carousel">
    <ol id="call-${this.label}-carousel-indicators" class="carousel-indicators">
    </ol>
    <div id="call-${this.label}-carousel-items" class="carousel-inner">
    </div>
    <a class="carousel-control-prev" href="#call-${this.label}-carousel" role="button" data-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="sr-only">Previous</span>
    </a>
    <a class="carousel-control-next" href="#call-${this.label}-carousel" role="button" data-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="sr-only">Next</span>
    </a>
</div>
<div class="btn-group d-flex my-2">
    <button id="call-${this.label}-waypoints-skip-button" 
            type="button" class="btn btn-danger w-100"
            title="Skip waypoint">
        <span class="fas fa-stop"></span> 
    </button>
    <button id="call-${this.label}-waypoints-backward-button" 
            type="button" class="btn btn-warning w-100"
            title="Move waypoint back">
        <span class="fas fa-backward"></span> 
    </button>
    <button id="call-${this.label}-waypoints-add-button" 
            type="button" class="btn btn-info w-100"
            title="Add waypoint">
        <span class="fas fa-plus"></span> 
    </button>
    <button id="call-${this.label}-waypoints-forward-button" 
            type="button" class="btn btn-warning w-100"
            title="Move waypoint forth">
        <span class="fas fa-forward"></span> 
    </button>
</div>`
        );

        // add existing waypoints
        let index = 0;
        this.waypoints.forEach((waypoint) => {

            this.addWaypointForm(index, waypoint);
            index += 1;

        });

    }

    postRender() {

        // configure buttons
        this.configureEditorButtons();

        // add waypoint
        $(`#call-${this.label}-waypoints-add-button`)
            .on('click', (event) => {

                event.stopPropagation();

                this.addBlankWaypointForm( this.waypoints.length );

            });

        // move back
        $(`#call-${this.label}-waypoints-backward-button`)
            .on('click', (event) => {

                event.stopPropagation();

                if (this.activeIndex === 0) {
                    logger.log('error', 'At first index, cannot move back');
                    return;
                }

                // get current active and previous waypoints
                const activeWaypoint = this.getActiveWaypoint();
                const previousWaypoint = this.waypoints[this.activeIndex - 1];

                // swap items
                swap(`#call-${this.label}-carousel-waypoint-${activeWaypoint.order}-item`,
                    `#call-${this.label}-carousel-waypoint-${previousWaypoint.order}-item`);

            });

        // move forward
        $(`#call-${this.label}-waypoints-forward-button`)
            .on('click', (event) => {

                event.stopPropagation();

                if (this.activeIndex === this.waypoints.length - 1) {
                    logger.log('error', 'At last index, cannot move forth');
                    return;
                }

                // get current active and previous waypoints
                const activeWaypoint = this.getActiveWaypoint();
                const nextWaypoint = this.waypoints[this.activeIndex + 1];

                // swap items
                swap(`#call-${this.label}-carousel-waypoint-${activeWaypoint.order}-item`,
                    `#call-${this.label}-carousel-waypoint-${nextWaypoint.order}-item`);

            });

        // activate carousel
        $(`#call-${this.label}-carousel`)
            .carousel({
                interval: false,
                wrap: false
            })
            .on('slide.bs.carousel', (event) => {

                // set active waypoint and configure buttons
                this.setActiveWaypoint(event.to);
                this.configureEditorButtons();

                logger.log('info', 'setting active waypoint %d', this.activeIndex);

            });

        logger.log('info', 'rendering waypoint editor for call %s', this.label);

    }

    addWaypointForm(index, waypoint) {

        const active = index === this.activeIndex;

        $(`#call-${this.label}-carousel-items`).append(
            `<div class="carousel-item ${active ? ' active' : ''}"
    id="call-${this.label}-carousel-waypoint-${waypoint.order}-item">
        ${waypoint.render(this.label)}
</div>`
        );

        $(`#call-${this.label}-carousel-indicators`).append(
            `<li data-target="#call-${this.label}-carousel" 
    data-slide-to="${index}" 
    ${active ? 'class="active"' : ''}>
</li>`
        );

        waypoint.postRender(this.label);

    }

    setActiveWaypoint(index) {
        this.activeIndex = index;
    }

    getActiveWaypoint() {
        return this.waypoints[this.activeIndex];
    }

    getNextWaypointIndex() {

        // next waypoint
        let nextWaypoint = -1;

        // loop over waypoints
        let index = 0;
        for (const waypoint of this.waypoints) {

            // is it next?
            if ((waypoint.status === 'C' || waypoint.status === 'V') && nextWaypoint === -1) {
                nextWaypoint = index;
                break;
            }

            index += 1;

        }

        return nextWaypoint;

    }

    removeWaypointForm(index) {

        // mark as deleted
        this.placeholder
            .find('#waypoint-' + this.label + '-' + index + '-form input')
            .addClass('deleted');

        // remove from form
        this.placeholder
            .find('#waypoint-' + this.label + '-' + index + '-form')
            .hide();

    }

    addBlankWaypointForm(index) {

        logger.log('info', 'adding blank waypoint');

        // create blank waypoint, update maxOrder and add to list
        this.maxOrder += 1;
        const waypoint = new Waypoint({maxOrder: this.maxOrder});
        this.waypoints.push(waypoint);

        this.addWaypointForm(index, waypoint);

    }

    configureEditorButtons() {

        const waypoint = this.getActiveWaypoint();
        const nextWaypointIndex = this.getNextWaypointIndex();

        logger.log('debug', 'activeWaypoint = %d, nextWaypoint = %d', this.activeIndex, nextWaypointIndex);

        // enable/disable buttons
        let skipButtonDisabled = false;
        if (waypoint.status === 'S' || waypoint.status === 'D') {
            // waypoint has been skipped or visited already
            skipButtonDisabled = true;
        }

        let addButtonDisable = true;
        if (this.activeIndex >= nextWaypointIndex ||
            (this.activeIndex === this.waypoints.length - 1)) {
            // waypoint is either next, hasn't come yet or it the last one
            addButtonDisable = false;
        }

        let forwardButtonDisable = true;
        if ( this.activeIndex >= nextWaypointIndex
            && this.activeIndex < this.waypoints.length - 1
            && (waypoint.status === 'C' || waypoint.status === 'S')) {
            // waypoint is next or beyond but not last and is either created or skipped
            forwardButtonDisable = false;
        }

        let backwardButtonDisable = true;
        if ( this.activeIndex > nextWaypointIndex
            && (waypoint.status === 'C' || waypoint.status === 'S')) {
            // waypoint is beyond next  and is either created or skipped
            backwardButtonDisable = false;
        }

        // disable skip
        $(`#call-${this.label}-waypoints-skip-button`)
            .attr('disabled', skipButtonDisabled);

        // disable forward
        $(`#call-${this.label}-waypoints-forward-button`)
            .attr('disabled', forwardButtonDisable);

        // disable backward
        $(`#call-${this.label}-waypoints-backward-button`)
            .attr('disabled', backwardButtonDisable);

        // disable add
        $(`#call-${this.label}-waypoints-add-button`)
            .attr('disabled', addButtonDisable);

    }

    getData() {

        // select all inputs
        const inputs = $(this.placeholderName + ' :input:not(:checkbox):not(:button):not(.deleted)');

        let entry = {};
        const waypoints = [];
        inputs.each( function() {

            // parse values
            let value = $(this).val().trim();
            if (this.name === 'name')
                entry[this.name] = value;
            else {
                value = parseInt(value);
                if ( !(this.name === 'id' && isNaN(value)) )
                    entry[this.name] = isNaN(value) ? null : value;
            }

            // is it the end of the structure?
            if (this.name === 'age') {
                if (entry.name || entry.age)
                    // skip if empty
                    waypoints.push(entry);
                entry = {};
            }

        });

        return waypoints;
    }

    same(waypoints) {
        return JSON.stringify(waypoints) === JSON.stringify(this.waypoints);
    }
}