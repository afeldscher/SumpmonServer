# Python 3 server example
import time
import json
from functools import partial
import threading
import datetime
import os
from datetime import datetime
from math import pi
from math import pow
import requests

ACTUAL_READINGS = True

if ACTUAL_READINGS:
    import board
    import adafruit_vl53l4cd

SAMPLE_PERIOD_SEC = 2
MIN_CHANGE_LEVEL = 1
SUMP_DEPTH_CM = 48
READ_SAMPLE_COUNT = 4

serverLevelApi = "https://feldscher.dev/sumpmon/api/level"
serverPort = 443
shutdown_flag = False

class LevelMsg:
    def __init__(self, _level):
        self.level = _level


class SensorReader:
    def __init__(self):
        self.level = 0
        self.prev_level = 0
        self.lock = threading.Lock()

        if ACTUAL_READINGS:
            self.vl53 = adafruit_vl53l4cd.VL53L4CD(board.I2C())
            self.vl53.inter_measurement = 0
            self.vl53.timing_budget = 200
            print("VL53L4CD Init")
            print("--------------------")
            model_id, module_type = self.vl53.model_info
            print("Model ID: 0x{:0X}".format(model_id))
            print("Module Type: 0x{:0X}".format(module_type))
            print("Timing Budget: {}".format(self.vl53.timing_budget))
            print("Inter-Measurement: {}".format(self.vl53.inter_measurement))
            print("--------------------")
            self.vl53.start_ranging()


    def sensor_val_to_level(self, sensor_val):
        return SUMP_DEPTH_CM - sensor_val


    def do_read(self):
        sensor_val = 0.0
        if ACTUAL_READINGS:
            # print("Starting sample collect")
            for i in range(READ_SAMPLE_COUNT):
                # Clear interrupt and wait for a new value to come in
                self.vl53.clear_interrupt()
                while not self.vl53.data_ready:
                    time.sleep(0.1) # 100ms
                sample_val = self.vl53.distance
                sensor_val += sample_val
                # print("Got ", i, sample_val)
                time.sleep(0.01) # 10ms

            sensor_val /= READ_SAMPLE_COUNT

        self.lock.acquire()
        if not ACTUAL_READINGS:
            self.level+=5
            if (self.level > SUMP_DEPTH_CM):
                self.level = 0
        else:
            self.level = self.sensor_val_to_level(sensor_val)

        if (abs(self.level - self.prev_level) > MIN_CHANGE_LEVEL):
            # self.history_cache.append(LevelHistoryEntryMsg(self.level, datetime.now()))
            print("Sending to server: ", self.level)
            level_obj = {'level': self.level}
            x = requests.post(serverLevelApi, json = level_obj)
            if x.status_code != 200:
                print(f"Failed to send level to deamon, code {x.status_code}")
            else:
                self.prev_level = self.level

        self.lock.release()


if __name__ == "__main__":        
    sensor_reader = SensorReader()
    while(not shutdown_flag):
        try:
            sensor_reader.do_read()
        except Exception as error:
            print("A read error as caught:", error)
        time.sleep(SAMPLE_PERIOD_SEC)

    shutdown_flag = True
    print("Server stopped.")
