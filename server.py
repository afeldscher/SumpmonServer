# Python 3 server example
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
import json
from functools import partial
import threading
import datetime
import os


hostName = "0.0.0.0"
serverPort = 8088
datafile = "datafile.json"
datafile_tmp = "datafile.json.tmp"
shutdown_flag = False

class LevelMsg:
    def __init__(self, _level):
        self.level = _level

class LevelHistoryEntryMsg:
    def __init__(self, _level, _date):
        self.level = _level
        self.datetime = _date

class JsonWriter:
    def write(self, json):
        f = open(datafile_tmp, "w")
        f.write(json)
        f.close()
        os.replace(datafile_tmp, datafile)

    def read(self):
        #open and read the file after the appending:
        f = open(datafile, "r")
        json = f.read()
        f.close()
        return json



class SumpMon:
    def __init__(self):
        self.level = 0
        self.lock = threading.Lock()
        self.json_writer = JsonWriter()
        self.history_cache = []
        self.load_cache()

    def load_cache(self):
        if os.path.exists(datafile):
            json_str = self.json_writer.read()
            objs = json.loads(json_str)
            self.history_cache = [LevelHistoryEntryMsg(h['level'], h['datetime']) for h in objs]

    def get_last_level(self):
        self.lock.acquire()
        ret = self.level
        self.lock.release()
        return ret

    def get_all_history_json(self):
        self.lock.acquire()
        hist_dict = [h.__dict__ for h in self.history_cache]
        hist_json = json.dumps(hist_dict, default=str)
        self.lock.release()
        return hist_json

    def do_read(self):
        self.lock.acquire()
        self.level+=1
        self.history_cache.append(LevelHistoryEntryMsg(self.level, datetime.datetime.now()))
        self.lock.release()
        json = self.get_all_history_json()
        self.json_writer.write(json)


    def run(self):
        while(not shutdown_flag):
            self.do_read()
            time.sleep(6)
        print("Write thread stopped")






class MyServer(BaseHTTPRequestHandler):
    def __init__(self, sump_mon, *args, **kwargs):
        self.sump_mon = sump_mon
        # BaseHTTPRequestHandler calls do_GET **inside** __init__ !!!
        # So we have to call super().__init__ after setting attributes.
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == "/level":
            return self.level_request()
        elif self.path == "/history":
            return self.history_request()
        else:
            self.send_response(404)
            self.send_header("Content-type", "text/html")
            self.end_headers()


    def level_request(self):
        self.send_response(200)
        self.send_header("Content-type", "text/json")
        self.end_headers()
        level_msg = LevelMsg(self.sump_mon.get_last_level())
        self.wfile.write(bytes(json.dumps(level_msg.__dict__), "utf-8"))

    def history_request(self):
        self.send_response(200)
        self.send_header("Content-type", "text/json")
        self.end_headers()
        hist = self.sump_mon.get_all_history_json()
        self.wfile.write(bytes(hist, "utf-8"))



if __name__ == "__main__":        
    sump_mon = SumpMon()
    x = threading.Thread(target=sump_mon.run, args=())
    x.start()

    handler = partial(MyServer, sump_mon)
    webServer = HTTPServer((hostName, serverPort), handler)
    print("Server started http://%s:%s" % (hostName, serverPort))
    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    shutdown_flag = True
    print("Server stopped.")
