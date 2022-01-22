//MADE BY SAMARTHCAT FROM SAMSIDPARTY
/*

  /$$$$$$   /$$$$$$  /$$      /$$  /$$$$$$  /$$$$$$ /$$$$$$$  /$$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$ /$$     /$$
 /$$__  $$ /$$__  $$| $$$    /$$$ /$$__  $$|_  $$_/| $$__  $$| $$__  $$ /$$__  $$| $$__  $$|__  $$__/|  $$   /$$/
| $$  \__/| $$  \ $$| $$$$  /$$$$| $$  \__/  | $$  | $$  \ $$| $$  \ $$| $$  \ $$| $$  \ $$   | $$    \  $$ /$$/ 
|  $$$$$$ | $$$$$$$$| $$ $$/$$ $$|  $$$$$$   | $$  | $$  | $$| $$$$$$$/| $$$$$$$$| $$$$$$$/   | $$     \  $$$$/  
 \____  $$| $$__  $$| $$  $$$| $$ \____  $$  | $$  | $$  | $$| $$____/ | $$__  $$| $$__  $$   | $$      \  $$/   
 /$$  \ $$| $$  | $$| $$\  $ | $$ /$$  \ $$  | $$  | $$  | $$| $$      | $$  | $$| $$  \ $$   | $$       | $$    
|  $$$$$$/| $$  | $$| $$ \/  | $$|  $$$$$$/ /$$$$$$| $$$$$$$/| $$      | $$  | $$| $$  | $$   | $$       | $$    
 \______/ |__/  |__/|__/     |__/ \______/ |______/|_______/ |__/      |__/  |__/|__/  |__/   |__/       |__/    
                                                                                                                                                                                                                                                                                                                             

*/
//This code doesn't use ssl, but you can easliy change it to use https if you have a certificate
//This script only works for http and https(untested), so it won't work on TCP or UDP
//POST requests won't work unfortunately, only GET requests will
//Feel free to edit and redistribute this code however you want but please give credit
//github.com/SamarthCat

const { randomUUID } = require('crypto');
const express = require("express");
const app = express();
const cookieParser = require('cookie-parser')
var bodyParser = require('body-parser');
const WebSocket = require('ws');

//CONFIG
const PORT = 8080;
//Clients need the password to setup a tunnel, make sure all clients have this
const PASSWORD = "catz";

var rawOptions = {
    limit: "10000000kb",
    inflate: true,
    type: "*/*",
    verify: false
}
app.use(bodyParser.raw(rawOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(cookieParser())
app.set('trust proxy', true)


var activeTunnels = [];
var pendingRequests = [];
var registeredSockets = [];

function makeTunnel(req, res) {
    var tunnelName = req.params["tunnelname"];
    
    if (req.params["password"] != PASSWORD){
        //The password is incorrect
        console.error("A Connection Attempt Was Made With An Invalid Password: " + req.params["password"])
        return;
    }

    //Check if tunnel already exists
    
    var exists = activeTunnels.some((e) => Object.entries(e).toString() === Object.entries(tunnelName).toString())
    
    if (exists){
        console.log("Tunnel Already Exists");
        res.send("Tunnel Already Exists");
    }
    else{
        activeTunnels.push(tunnelName);
        console.log("Creating Tunnel Called " + tunnelName);
        res.send("Success");
    }
    

}

function getPending(req, res){
    var tunnelsToReturn = [];
    var tunnelName = req.params["tunnelname"];

    if (req.params["password"] != PASSWORD){
        //The password is incorrect
        console.error("A Connection Attempt Was Made With An Invalid Password: " + req.params["password"])
        return;
    }
    
    var exists = activeTunnels.some((e) => Object.entries(e).toString() === Object.entries(tunnelName).toString())

    if (!exists){
        res.send("Invalid Tunnel");
    }

    //Add all requests to array
    for (var i = 0; i < pendingRequests.length; i++){
        if (pendingRequests[i].tunnel == tunnelName && pendingRequests[i].active){
            tunnelsToReturn.push(Object.assign({}, pendingRequests[i]));
            pendingRequests[i].active = false;
        }
    }

    //Remove unserializable crap
    for (var i = 0; i < tunnelsToReturn.length; i++){
        tunnelsToReturn[i].response = null;
    }

    res.send(JSON.stringify(tunnelsToReturn));
}

function createRequest(req, res){
    var tunnelName = req.params["tunnelname"];

    var exists = activeTunnels.some((e) => Object.entries(e).toString() === Object.entries(tunnelName).toString())

    if (!exists){
        res.send("Invalid Tunnel");
    }

    var resource = req.originalUrl.split(tunnelName)[1];
    if (resource == ""){
        resource = "/";
    }

    var request = {
        requestID: randomUUID(),
        tunnel: tunnelName,
        active: true,
        pending: true,
        response: res,
        endpoint: resource,
        cookies: req.cookies,
        headers: req.headers,
        protocol: req.protocol
    }

    pendingRequests.push(request);

    //Send the request over websockets if something is listening for it
    var tunnelSocket = getSocketByTunnel(tunnelName);
    if (tunnelSocket != -1){
        var requestToSend = Object.assign({}, request)
        //Remove unserializable crap
        requestToSend.response = null;
        registeredSockets[tunnelSocket].connection.send(JSON.stringify(requestToSend));
    }
}

function fullfillRequest(req, res){
    var uuid = req.params["uuid"];
    var headers = req.headers;
    var content = req.body;

    if (req.params["password"] != PASSWORD){
        //The password is incorrect
        console.error("A Connection Attempt Was Made With An Invalid Password: " + req.params["password"])
        return;
    }

    var valid = false;

    //Find request
    for (var i = 0; i < pendingRequests.length; i++){
        if (pendingRequests[i].requestID == uuid){
            Object.entries(headers).map(([key, value]) => pendingRequests[i].response.append(key, value))
            if (req.headers["fakecontent"] != "cached"){
                pendingRequests[i].response.send(content);
                pendingRequests[i].pending = false;
            }
            else{
                console.log("Using Cached Item For " + pendingRequests[i].endpoint)
                pendingRequests[i].response.sendStatus(304);
                pendingRequests[i].pending = false;
            }

            valid = true;
        }
    }

    if (valid){
        res.send("Sent");
    }
    else{
        res.send("Failed To Send");
    }


    //Remove fullfilled request
    pendingRequests = pendingRequests.filter(item => item.pending == true);

}

function getStringBetween(str, start, end) {
    const result = str.match(new RegExp(start + "(.*)" + end));

    return result[1];
}

function fallBackTunnelDetection(req){
    return req.cookies["tunnelname"]
}

function redirectResource(req, res){
    var resource = req.originalUrl.split(":" + PORT.toString())[0];
    var referer = req.get('Referrer')

    try{
        if (!referer.endsWith("/")){
            referer = referer = "/";
        }
        var tunnel = getStringBetween(referer, "tunnels/", "/")
    }
    catch{
        var tunnel = fallBackTunnelDetection(req);
    }

    if (tunnel == undefined){
        res.sendStatus(404);
        return;
    }

    console.log("Redirecting Root Request \"" + resource + "\" To " + tunnel);

    //Now we will create a fake request object
    var fakerequest = {
        cookies: req.cookies,
        headers: req.headers,
        protocol: req.protocol,
        originalUrl: "/tunnel/" + tunnel + "/" + resource,
        params: {
            tunnelname: tunnel
        }
    }
    createRequest(fakerequest, res)
}

function findRightPage(req, res){
    try{
        var tunnel = fallBackTunnelDetection(req);
        if (!tunnel){
            res.send("We Don't Know Where You Should Go (SAD)");
            return;
        }
        res.redirect("/tunnels/" + tunnel + "/");
    }
    catch{
        res.send("We Don't Know Where You Should Go :(");
    }
}

function getSocketByTunnel(tunnel) {
    for (var i=0, iLen=registeredSockets.length; i<iLen; i++) {
      if (registeredSockets[i] != undefined && registeredSockets[i].tunnel == tunnel) return i;
    }

    return -1;
}

//HTTP
app.get("/maketunnel/:tunnelname/:password", (req, res) => makeTunnel(req, res));
app.get("/getpending/:tunnelname/:password", (req, res) => getPending(req, res));
app.post("/fullfill/:uuid/:password", (req, res) => fullfillRequest(req, res));
app.get("/tunnels/:tunnelname*", (req, res) => createRequest(req, res));
app.get("/", (req, res) => findRightPage(req, res));

//websites will try to get requests from root
app.get("*", (req, res) => redirectResource(req, res));



const server = app.listen(PORT, () => console.log("Server listening on port " + PORT));

//Websockets
const websocketServer = new WebSocket.Server({
    noServer: true,
    path: "/ws",
});

server.on("upgrade", (request, socket, head) => {
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit("connection", websocket, request);
    });
});

websocketServer.on(
    "connection",
    function connection(websocketConnection, connectionRequest) {
        var tunnel = connectionRequest.headers["tunnelname"]
        var pass = connectionRequest.headers["password"]

        if (pass != PASSWORD){
            //The password is incorrect
            console.error("A Websocket Connection Attempt Was Made With An Invalid Password")
            return;
        }

        var existingSocket = getSocketByTunnel(tunnel);
        if (existingSocket != -1){
            //Close existing listener for this tunnel
            console.log("A Socket Is Already Registered To Tunnel " + tunnel + ", Unregistering Previous Connection.");
            delete registeredSockets[existingSocket];
        }

        registeredSockets.push({
            connection: websocketConnection,
            tunnel: tunnel
        });
        console.log('Registered Socket To Tunnel ' + tunnel);
        

        websocketConnection.on("message", (msg) => {
            msg = msg.toString();
        });
    }
);
