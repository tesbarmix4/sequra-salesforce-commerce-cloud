/**
 * SEQURA SERVICE Logic
 */
var dwsvc = require('dw/svc');
var dwsystem = require('dw/system');

var SequraService = {

    // service constants
    SERVICE: {
        SEQURA: 'int_sequra.http.rest'
    },

    getService: function (service) {
        // Create the service config (used for all services)
        var sequraService = null;
        try {
            sequraService = dwsvc.LocalServiceRegistry.createService(service, {
                createRequest: function (svc, args) {
                    var bytePass = new dw.util.Bytes(svc.configuration.credential.user + ':' + svc.configuration.credential.password);
                    var encryptedPass = dw.crypto.Encoding.toBase64(bytePass);
                    svc.addHeader('Content-type', 'application/json');
                    svc.addHeader('charset', 'UTF-8');
                    svc.addHeader('Authorization', 'Basic ' + encryptedPass);
                    if (args) {
                        return JSON.stringify(args);
                    }
                    return null;
                },
                parseResponse: function (svc, client) {
                    return client;
                },
                filterLogMessage: function filterLogMessage(msg) {
                    return msg;
                }
            });
            dwsystem.Logger.getLogger('Sequra', 'sequra').debug('Successfully retrive service with name {0}', service);
        } catch (e) {
            dwsystem.Logger.getLogger('Sequra', 'sequra').error("Can't get service instance with name {0}", service);
        }
        return sequraService;
    }
};

module.exports = SequraService;
