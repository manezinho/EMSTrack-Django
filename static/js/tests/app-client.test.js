import { expect } from 'chai';

const axios = require('axios');

import { MqttClient, MqttMessageArrivedEvent } from "../mqtt-client";

import { AppClient } from "../app-client";

class MockMqttClient extends MqttClient {

    constructor() {
        super(undefined, undefined, undefined, 2);
    }

    subscribe(filter, options) {
    }

    publish(topic, payload, qos, retained) {
        const message = {
            destinationName: topic,
            payloadString: payload,
            qos: qos,
            retained: retained
        };
        this.broadcast(new MqttMessageArrivedEvent(message));
    }

    unsubscribe(filter, options) {
    }

}

describe('client observe', () => {

    it('observe pattern', (done) => {

        const mqttClient = new MockMqttClient();

        const client = new AppClient(mqttClient, undefined);

        let receivedData = '';
        let fn;
        new Promise(function (resolve, reject) {

            fn = function (data) {
                receivedData = data;
                resolve('got it!');
            };

            setTimeout(() => reject(new Error("timeout!")), 1000);

            client._subscribe('test/ambulance/1/data', fn);
            client.publish('test/ambulance/1/data', '"something"', 2, true);

        })
            .then( () => {
                expect(receivedData).to.eql({topic: 'test/ambulance/1/data', payload: 'something'});
                client._unsubscribe('test/ambulance/1/data', fn);
                done();
            })
            .catch(
                (error) => { console.log(error); done(new Error('Did not receive!'));}
            );

    });

});

describe('client connection', () => {

    const userName = 'admin';
    const password = 'cruzrojaadmin';

    let token = null;
    let mqttPassword = null;

    let mqttClient = null;
    let httpClient = null;
    let client = null;

    it('get token', function(done) {

        axios.post('http://localhost:8000/en/auth/token/',
            {
                username: userName,
                password: password
            }
        )
            .then( (response) => {
                token = response.data.token;
                expect(token !== null).to.equal(true);
                done();
            })
            .catch( (error ) => {
                done(new Error(error));
            });

    });

    it('create http client and get password', function(done) {

        httpClient = axios.create({
            baseURL: 'http://localhost:8000/en/api/',
            timeout: 1000,
            headers: {'Authorization': 'Token ' + token}
        });

        httpClient.get('user/' + userName + '/password/')
            .then( (response) => {
                mqttPassword = response.data;
                expect(mqttPassword !== null).to.equal(true);
                done();
            })
            .catch( (error ) => {
                done(new Error(error));
            });

    });

    it('create mqtt client', function(done) {

        mqttClient = new MqttClient('localhost', 8884, 'test-client', 0);

        mqttClient.connect({
                userName: userName,
                password: mqttPassword
        })
            .then( () => {
                done();
            })
            .catch( (error) => {
                console.log(error); done(new Error('Did not receive!'));
            });

    });

    it('publish and receive', function(done) {

        client = new AppClient(mqttClient, httpClient);

        let receivedData = '';
        let fn;
        new Promise(function (resolve, reject) {

            fn = function (data) {
                receivedData = data;
                resolve('got it!');
            };

            client._subscribe('test/data', fn);
            client.publish('test/data', '"something"', 2, false);

        })
            .then(
                () => {
                    expect(receivedData).to.eql({topic: 'test/data', payload: 'something'});
                    client._unsubscribe('test/data', fn);
                    done();
                }
            )
            .catch(
                (error) => { console.log(error); done(new Error('Did not receive!'));}
            );

    });

    it('retrieve ambulances', function(done) {

        // retrieve ambulances
        expect(client.ambulances).to.be.an('undefined');
        client.getAmbulances()
            .then( () => {
                expect(client.ambulances).to.be.an('object');
                done();
            } )
            .catch( (error) => {
                console.log(error); done(new Error(error));
            });

    });

    it('retrieve hospitals', function(done) {

        // retrieve hospitals
        expect(client.hospitals).to.be.an('undefined');
        client.getHospitals()
            .then( () => {
                expect(client.hospitals).to.be.an('object');
                done();
            } )
            .catch( (error) => {
                console.log(error); done(new Error(error));
            });

    });

    it('retrieve calls', function(done) {

        // retrieve calls
        expect(client.calls).to.be.an('undefined');
        client.getCalls()
            .then( () => {
                expect(client.calls).to.be.an('object');
                done();
            } )
            .catch( (error) => {
                console.log(error); done(new Error(error));
            });

    });

    it('retrieve bases', function(done) {

        // retrieve bases
        expect(client.bases).to.be.an('undefined');
        client.retrieveBases()
            .then( () => {
                expect(client.bases).to.be.an('object');
                done();
            } )
            .catch( (error) => {
                console.log(error); done(new Error(error));
            });

    });
    
    it('should disconnect', function(done) {

        const resolvingPromise = new Promise(function(resolve, reject) {
            // the function is executed automatically when the promise is constructed
            client.disconnect();
            while (client.mqttClient.isConnected) { /* wait */ }
            resolve('disconnected');

            setTimeout(() => reject(new Error("timeout!")), 1000);
        });

        resolvingPromise
            .then(
                (result) => {
                    expect(result).to.equal('disconnected');
                    expect(client.mqttClient.isConnected).to.equal(false);
                    expect(client.event_observer).to.equal(null);
                },
                () => {}
            )
            .finally(done);

    })

});
