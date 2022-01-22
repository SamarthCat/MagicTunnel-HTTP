#MADE BY SAMARTHCAT FROM SAMSIDPARTY
"""

  /$$$$$$   /$$$$$$  /$$      /$$  /$$$$$$  /$$$$$$ /$$$$$$$  /$$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$ /$$     /$$
 /$$__  $$ /$$__  $$| $$$    /$$$ /$$__  $$|_  $$_/| $$__  $$| $$__  $$ /$$__  $$| $$__  $$|__  $$__/|  $$   /$$/
| $$  \__/| $$  \ $$| $$$$  /$$$$| $$  \__/  | $$  | $$  \ $$| $$  \ $$| $$  \ $$| $$  \ $$   | $$    \  $$ /$$/ 
|  $$$$$$ | $$$$$$$$| $$ $$/$$ $$|  $$$$$$   | $$  | $$  | $$| $$$$$$$/| $$$$$$$$| $$$$$$$/   | $$     \  $$$$/  
 \____  $$| $$__  $$| $$  $$$| $$ \____  $$  | $$  | $$  | $$| $$____/ | $$__  $$| $$__  $$   | $$      \  $$/   
 /$$  \ $$| $$  | $$| $$\  $ | $$ /$$  \ $$  | $$  | $$  | $$| $$      | $$  | $$| $$  \ $$   | $$       | $$    
|  $$$$$$/| $$  | $$| $$ \/  | $$|  $$$$$$/ /$$$$$$| $$$$$$$/| $$      | $$  | $$| $$  | $$   | $$       | $$    
 \______/ |__/  |__/|__/     |__/ \______/ |______/|_______/ |__/      |__/  |__/|__/  |__/   |__/       |__/    
                                                                                                                                                                                                                                                                                                                             

"""
#This code doesn't use ssl, but you can easliy change it to use https if you have a certificate
#This script only works for http and https(untested), so it won't work on TCP or UDP
#POST requests won't work unfortunately, only GET requests will
#Feel free to edit and redistribute this code however you want but please give credit
#github.com/SamarthCat

import time
import requests
import json
import asyncio

#CONFIG
serverAddress = "http://127.0.0.1:8080"
serverWSAddress = "ws://127.0.0.1:8080/ws"
tunnelName = "tunnelname"
tickRate = 20
localport = 25640
localprotocol = "http"
#This must be the same password as what you set on the server
password = "catz"

#This can either be "websockets" or "http"
#If it is websockets, then it will fullfill a request when the server sends one over ws
#If it is http, then it will poll the server every 1 / <tickrate> seconds to get the pending requests
pollingmethod = "websockets"



#CALCULATIONS
makeTunnelEndpoint = serverAddress + "/maketunnel/%PARAM%/" + password
getPendingEndpoint = serverAddress + "/getpending/%PARAM%/" + password
fullfillEndpoint = serverAddress + "/fullfill/%PARAM%/" + password
interval = 1 / tickRate

#First, we need to make a tunnel
r = requests.get(makeTunnelEndpoint.replace("%PARAM%", tunnelName))
r.close()

print("Tunnel Running On " + serverAddress + "/tunnels/" + tunnelName + "/")

#If we are using the ws polling, then we open a ws connection
async def registerWS():

    extraheaders = [("tunnelname", tunnelName), ("password", password)]

    websocket = await websockets.connect(serverWSAddress, extra_headers=extraheaders)
    #await websocket.send("REGISTERTUNNEL:" + tunnelName)

    while (True):
        r = await websocket.recv()
        pendingRequest = json.loads(r)

        fullfillrequest(pendingRequest)

def fullfillrequest(pendingRequest):
    #Make the request locally
    localheaders = pendingRequest["headers"]

    #Prevent HTTP 304 messages by removing cache headers
    #Uncomment these lines if you get cache errors
    #localheaders["Cache-Control"] = "no-cache"
    #localheaders["If-Modified-Since"] = "Wed, 19 Jan 1980 08:58:30 GMT"

    localr = requests.get(localprotocol + "://127.0.0.1:" + str(localport) + pendingRequest["endpoint"], headers=localheaders)
    print("GET " + pendingRequest["endpoint"] + " " + str(localr.status_code))

    if (localr.status_code == 304):
        #The local server returned 304
        print("Reusing Cached Resource " + pendingRequest["endpoint"])
        headerstosend = localr.headers
        headerstosend["fakecontent"] = "cached"
        fullfillr = requests.post(fullfillEndpoint.replace("%PARAM%", pendingRequest["requestID"]), data="!304 Not Changed!", headers=headerstosend)
        fullfillr.close()
    else:
        #Now we fullfill the request
        data = localr.content
        headers = localr.headers

        #Inject into html files
        injection = "<script>\r\n\t//This was injected by the tunneling client to ensure proper functionality :)\r\n\tdocument.cookie = \"tunnelname=; path=/\";\r\n\tdocument.cookie = \"tunnelname=%TUNNELNAME%; path=/\";\r\n</script>\r\n\r\n"
        injection = injection.replace("%TUNNELNAME%", tunnelName)

        try:
            if ("text/html" in headers["content-type"]):
                textdata = localr.text
                #Append to the bottom of the head
                textdata = textdata.replace("</head>", "\n" + injection + "</head>\n")
                data = textdata.encode("utf-8")
        except:
            pass

        fullfillr = requests.post(fullfillEndpoint.replace("%PARAM%", pendingRequest["requestID"]), data=data, headers=localr.headers)
        fullfillr.close()



if (pollingmethod == "websockets"):
    import websockets
    asyncio.run(registerWS())

if (pollingmethod == "http"):
    while (True):

        #Get pending requests to fullfill
        r = requests.get(getPendingEndpoint.replace("%PARAM%", tunnelName))
        pendingRequests = json.loads(r.text)
        r.close()

        #Loop through all pending requests
        for i in range(len(pendingRequests)):
            fullfillrequest(pendingRequests[i])

        time.sleep(interval)