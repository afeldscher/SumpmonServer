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
import sqlalchemy as db

FLOW_RATE_SAMPLE_DISTANCE = 4
CC_PER_GAL = 3785.41
SUMP_DIAMETER_CM = 38
SUMP_DEPTH_CM = 48
RUN_DROP_AMOUNT = 4
hostName = "0.0.0.0"
serverPort = 5901
DB_USER = os.getenv('MYSQL_USER')
DB_PASSWORD = os.environ.get('MYSQL_PASSWORD')
MYSQL_DATABASE = os.environ.get('MYSQL_DATABASE')
DB_HOST = f"mysql://{DB_USER}:{DB_PASSWORD}@127.0.0.1:3308/{MYSQL_DATABASE}"


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


class DBAdapter:
    def __init__(self):
        # print(f"Using DB Host: {DB_HOST}")
        self.engine = db.create_engine(DB_HOST)
        self.connection = self.engine.connect()
        self.metadata = db.MetaData()
        self.level_table = db.Table('Levels', self.metadata,
              db.Column('id', db.Integer(), primary_key=True, autoincrement=True),
              db.Column('level', db.Double(), nullable=False),
              db.Column('date', db.DateTime(), nullable=False),
            )

        self.metadata.create_all(self.engine) #Creates the table
    
    def add_val(self, in_level):
        query = db.insert(self.level_table).values(level=in_level, date=datetime.now())
        ResultProxy = self.connection.execute(query)
        print("DB Result: ", ResultProxy)
        self.connection.commit()
    
    def get_history(self, start_date=None, end_date=None):
        history_list = []
        query = db.select(self.level_table.columns.level, self.level_table.columns.date)
        if start_date is not None:
            query = query.where(self.level_table.columns.date >= start_date)
        if end_date is not None:
            query = query.where(self.level_table.columns.date <= end_date)
        query = query.order_by(db.asc(self.level_table.columns.date))
        print("Query: ", query)
        ResultProxy = self.connection.execute(query)
        ResultSet = ResultProxy.fetchall()
        for row in ResultSet:
            hist_msg = LevelHistoryEntryMsg(row.level, row.date.isoformat())
            history_list.append(hist_msg.__dict__)
            
        return history_list



class SumpMon:
    def __init__(self, db_adapter: DBAdapter):
        self.level = 0
        self.prev_level = 0
        self.lock = threading.Lock()
        self.history_cache = []
        self.write_counter = 0
        self.db_adapter = db_adapter

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
        # hist_dict = [h.__dict__ for h in self.history_cache]
        hist_dict = self.db_adapter.get_history() # TODO Dates
        hist_json = json.dumps(hist_dict, default=str)
        self.lock.release()
        return hist_json
    
    def get_num_runs_history_json(self):
        self.lock.acquire()
        runs_by_date = {}
        prev_max_val = 0
        # assuming entries are in order
        for entry in self.history_cache:
            if (entry.level + RUN_DROP_AMOUNT) < prev_max_val:
                # print("Detected sump run", entry.__dict__, prev_val, entry.datetime)
                if isinstance(entry.datetime, str):
                    datetime_object = datetime.strptime(entry.datetime, '%Y-%m-%d %H:%M:%S.%f')
                else:
                    datetime_object = entry.datetime
                date_str = datetime_object.date()
                runs_by_date[date_str] = runs_by_date[date_str] + 1 if date_str in runs_by_date else 1
                prev_max_val = 0
            # update prev
            if (entry.level > prev_max_val):
                prev_max_val = entry.level

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
        sample_distance = 0
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

            if sample_distance < FLOW_RATE_SAMPLE_DISTANCE:
                # Skip this sample to reduce noise
                sample_distance += 1
                continue
            else:
                sample_distance = 0
                # proceed to add flow point

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


    def sensor_val_to_level(self, sensor_val):
        return SUMP_DEPTH_CM - sensor_val

    def update_level(self, level):
        self.lock.acquire()
        self.level = level
        db_adapter.add_val(level)
        self.lock.release()




class MyServer(BaseHTTPRequestHandler):
    def __init__(self, sump_mon: SumpMon, *args, **kwargs):
        self.sump_mon = sump_mon
        # BaseHTTPRequestHandler calls do_GET **inside** __init__ !!!
        # So we have to call super().__init__ after setting attributes.
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == "/level":
            return self.level_get_request()
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


    def do_POST(self):
        if self.path == "/level":
            return self.level_post_req()
        else:
            self.send_response(404)
            self.send_header("Content-type", "text/html")
            self.end_headers()


    def level_post_req(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        level_obj = json.loads(post_data)
        if 'level' in level_obj:
            posted_level = level_obj['level']
            print("Posted level: ", posted_level)
            self.sump_mon.update_level(posted_level)
            self.send_response(200)
            self.send_header("Content-type", "text/json")
            self.end_headers()
        else:
            print("Invalid request, level not found")
            self.send_response(400)
            self.send_header("Content-type", "text/json")
            self.end_headers()

    def level_get_request(self):
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
    db_adapter = DBAdapter()
    sump_mon = SumpMon(db_adapter)
    handler = partial(MyServer, sump_mon)
    webServer = HTTPServer((hostName, serverPort), handler)
    print("Server started http://%s:%s" % (hostName, serverPort))
    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")
