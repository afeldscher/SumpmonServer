# Python 3 server example
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
import json
from functools import partial
import threading
import datetime
import os
from datetime import datetime
from math import pi
from math import pow

CC_PER_GAL = 3785.41
SUMP_DIAMETER_CM = 30
RUN_DROP_AMOUNT = 10
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

class FlowRateHistoryEntryMsg:
    def __init__(self, _flow_rate, _date):
        self.flow_rate = _flow_rate
        self.datetime = _date

class RunsHistoryEntryMsg:
    def __init__(self, _runs, _date):
        self.runs = _runs
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

    def level_to_gallons(self, level_cm):
        ccs = pi * pow(SUMP_DIAMETER_CM / 2, 2) * level_cm # pi * r^2 * h
        gallons = ccs / CC_PER_GAL
        return gallons

    def get_all_history_json(self):
        self.lock.acquire()
        hist_dict = [h.__dict__ for h in self.history_cache]
        hist_json = json.dumps(hist_dict, default=str)
        self.lock.release()
        return hist_json
    
    def get_num_runs_history_json(self):
        self.lock.acquire()
        runs_by_date = {}
        prev_val = 0
        # assuming entries are in order
        for entry in self.history_cache:
            if (entry.level + RUN_DROP_AMOUNT) < prev_val:
                # print("Detected sump run", entry.__dict__, prev_val, entry.datetime)
                if isinstance(entry.datetime, str):
                    datetime_object = datetime.strptime(entry.datetime, '%Y-%m-%d %H:%M:%S.%f')
                else:
                    datetime_object = entry.datetime
                date_str = datetime_object.date()
                runs_by_date[date_str] = runs_by_date[date_str] + 1 if date_str in runs_by_date else 1
            prev_val = entry.level

        runs_hist_list = []
        for key in runs_by_date:
            runs_hist_list.append(RunsHistoryEntryMsg(runs_by_date[key], key))
            
        runs_hist_dict = [h.__dict__ for h in runs_hist_list]
        runs_hist_json = json.dumps(runs_hist_dict, default=str)
        self.lock.release()
        return runs_hist_json


    def get_flow_rate_history_json(self):
        self.lock.acquire()
        flow_rates_hist_list = []
        prev_val = -1
        prev_date = datetime.now()
        # assuming entries are in order
        for entry in self.history_cache:
            datetime_object = None
            if isinstance(entry.datetime, str):
                datetime_object = datetime.strptime(entry.datetime, '%Y-%m-%d %H:%M:%S.%f')
            else:
                datetime_object = entry.datetime
            
            if prev_val == -1:
                # Store first prevs and skip
                prev_val = entry.level
                prev_date = datetime_object
                continue

            level_delta = entry.level - prev_val
            gallons_delta = self.level_to_gallons(level_delta)
            mins_delta = (datetime_object - prev_date).total_seconds() / 60.0
            flow_rate = gallons_delta / mins_delta
            flow_rates_hist_list.append(FlowRateHistoryEntryMsg(flow_rate, entry.datetime).__dict__)

            # Store Prevs
            prev_val = entry.level
            prev_date = datetime_object

        flow_rates_hist_json = json.dumps(flow_rates_hist_list, default=str)
        self.lock.release()
        return flow_rates_hist_json


    def do_read(self):
        self.lock.acquire()
        self.level+=5
        if (self.level > 100):
            self.level = 0
        
        self.history_cache.append(LevelHistoryEntryMsg(self.level, datetime.now()))
        self.lock.release()
        json = self.get_all_history_json()
        self.json_writer.write(json)


    def run(self):
        while(not shutdown_flag):
            self.do_read()
            time.sleep(6)
        print("Write thread stopped")






class MyServer(BaseHTTPRequestHandler):
    def __init__(self, sump_mon: SumpMon, *args, **kwargs):
        self.sump_mon = sump_mon
        # BaseHTTPRequestHandler calls do_GET **inside** __init__ !!!
        # So we have to call super().__init__ after setting attributes.
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == "/level":
            return self.level_request()
        elif self.path == "/history":
            return self.history_request()
        elif self.path == "/runs_history":
            return self.runs_history_request()
        elif self.path == "/flow_history":
            return self.flow_history_request()
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

    def runs_history_request(self):
        self.send_response(200)
        self.send_header("Content-type", "text/json")
        self.end_headers()
        hist = self.sump_mon.get_num_runs_history_json()
        self.wfile.write(bytes(hist, "utf-8"))

    def flow_history_request(self):
        self.send_response(200)
        self.send_header("Content-type", "text/json")
        self.end_headers()
        hist = self.sump_mon.get_flow_rate_history_json()
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
