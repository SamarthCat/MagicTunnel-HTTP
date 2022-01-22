# MagicTunnel Over HTTP
You have probably seen a lot of tunnelling softwares like ngrok or localtunnel, but this one is different. MagicTunnel only requires a single port to be forwarded on the server, and it doesn't use subdomains. The server is made in node.js and a client is available in python. If you wish to port the client to another language, then please submit a pull request.

# Installation
```
git clone https://github.com/SamarthCat/MagicTunnel-HTTP
cd MagicTunnel-HTTP
cd Server
npm install
cd ../
cd Clients
cd Python
python install-dependencies.py
```

# Configuring The Server
If you go into Server/magictunnel-http-server.js, you will see 2 config variables
```javascript
//CONFIG
const PORT = 8080;
const PASSWORD = "catz";
```
- The port will be the only port that the server uses to communicate with the clients. It will have to be port forwarded and accessible from the world wide web.

- The password is needed for clients to create and fullfill tunnels, please change it, don't keep it as default.

# Configuring The Client (Python)
If you go into Clients/Python/magictunnel-http-client.py, you will see multiple config variables
```python
#CONFIG
serverAddress = "http(s)://serveraddress.com:serverport"
serverWSAddress = "ws(s)://serveraddress.com:serverport/ws"
tunnelName = "tunnelname"
tickRate = 20
localport = 25640
localprotocol = "http"
password = "catz"
pollingmethod = "websockets"
```
- The server address is the address of the server including the port and protocol.

- The server websocket address is the address of the server including the port and protocol, but, the protocol is either ws or wss and it is followed by /ws. This only takes effect if the polling method is set to websockets.

- The tunnel name can be anything that is URL-safe, your choice.

- The tick rate is the amount of times per second that the client will poll the server for requests to fullfil.  This only takes effect if the polling method is set to http.

- The local port is the port that your localhost web server is running on, this is the port that will be tunneled to the world wide web.

- The local protocol is the protocol your localhost web server uses, either http or https.

- The password is what you set on the server, please change it from the default.

- The polling method can either be http or websockets, more about this later.

# How Do I View My Website In The Browser?
MagicTunnel doesn't use subdomains, instead, it uses paths

All tunnels can be accessed at
```
http(s)://serveraddress.com:serverport/tunnels/<tunnelname>/
```
This will forward the request to the client where it will process the request.

For example, if you go to
```
http(s)://serveraddress.com:serverport/tunnels/<tunnelname>/foo/bar.html
```
It will be equivalent to accessing
```
http(s)://localhost:clientport/foo/bar.html
```
on the client.

# Ok Then, How Does It Work?
First, the client sends the server a HTTP request at
```
http(s)://serveraddress.com:serverport/maketunnel/<tunnelname>/<password>
```
Notice how there is a password parameter? That's because modifying a tunnel requires authorization so that random end users can't fullfill requests on behalf of the server. The default password is "catz" but you should change it in the server and client code. The tunnel name can be anything you want, you can change it in the client code.

There are 2 different types of polling methods that the client can use to find out what requests it should fullfill. The first method is over HTTP(s), the client will send a request to
```
http(s)://serveraddress.com:serverport/getpending/<tunnelname>/<password>
```
This will return all the requests that the client needs to fullfill with a unique uuid for each one. The client will then forward those requests to localhost and return their responses in a POST request to
```
http(s)://serveraddress.com:serverport/fullfill/<uuid>/<password>
```
The second polling method uses websockets. The client connects to the server socket and incoming requests are directly forwarded to the client where they are fullfilled the same way.

# What About Incorrect Requests?
Lets say you have a link tag in your website
```html
<link rel="stylesheet" href="/style.css">
```
It works fine on localhost, because it will download
```
http(s)://localhost:clientport/style.css
```
But if that link runs on the tunnel, then it will attempt to download
```
http(s)://serveraddress.com:serverport/style.css
```
Which doesn't exist, so, there is a solution. The server will force the browser to send a cookie called "tunnelname", which will allow the server to know how to redirect the request. So, in our example, it will be redirected to
```
http(s)://serveraddress.com:serverport/tunnels/<tunnelname>/style.css
```
Which is the correct URL :)

# License
MagicTunnel is a SamsidParty software, so by using it you agree to this:
https://samsidparty.com/privacypolicy.html

Use the code however you like, it can be for personal projects or commercial releases, but, if you're going to redistribute, please credit SamsidParty.