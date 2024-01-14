


const API_BASE_URL="https://feldscher.dev/sumpmon/api"
// const API_BASE_URL=""


const timescales = ['1 hour', '12 hours', '1 Day', '2 Days', '7 Days', 'Full', 'All'];
let time_scale = timescales[0];
let slider_end_date = new Date();
let slider_start_date = new Date(slider_end_date.getDate() - 30);

function toggleVisibility(item) {
    if (item.isVisible()) {
      item.hide();
    } else {
      item.show();
    }
}




// --------------------------------
//            Pages Plot
// --------------------------------

function compare( a, b ) {
    if ( a.datetime < b.datetime ){
      return -1;
    }
    if ( a.datetime > b.datetime ){
      return 1;
    }
    return 0;
  }


function transform_levels(historical_data) {
    const sorted_historical_data = historical_data;
    sorted_historical_data.forEach((x) => { 
        x.date = new Date(x.datetime);
    });

    return sorted_historical_data;
}

function create_level_by_day(historical_data) {
    let dataSource = transform_levels(historical_data);

    const chart = $('#level-plot').dxChart({
        palette: 'ocean',
        dataSource,
        commonSeriesSettings: {
            type: 'spline',
            argumentField: 'date',
        },
        commonAxisSettings: {
            grid: {
            visible: true,
            },
        },
        margin: {
            bottom: 20,
        },
        series: [
            { valueField: 'level', name: 'Level' },
        ],
        tooltip: {
            enabled: true,
        },
        legend: {
            verticalAlignment: 'top',
            horizontalAlignment: 'right',
        },
        export: {
            enabled: true,
        },
        argumentAxis: {
            label: {
                format: 'monthAndDay' // month
            },
            allowDecimals: false,
            tickInterval: 'day', // month
        },
        title: 'Level Over Time',
    }).dxChart('instance');

}



function create_runs_by_day(historical_data) {
    let dataSource = transform_levels(historical_data);

    const chart = $('#runs-plot').dxChart({
        palette: 'ocean',
        dataSource,
        commonSeriesSettings: {
            type: 'bar',
            argumentField: 'date',
        },
        commonAxisSettings: {
            grid: {
            visible: true,
            },
        },
        margin: {
            bottom: 20,
        },
        series: [
            { valueField: 'runs', name: 'Runs' },
        ],
        tooltip: {
            enabled: true,
        },
        legend: {
            verticalAlignment: 'top',
            horizontalAlignment: 'right',
        },
        export: {
            enabled: true,
        },
        argumentAxis: {
            label: {
                format: 'monthAndDay' // month
            },
            allowDecimals: false,
            tickInterval: 'day', // month
        },
        title: 'Runs By Day',
    }).dxChart('instance');
}



function create_flow_rate_plot(historical_data) {
    let dataSource = transform_levels(historical_data);

    const chart = $('#flow-rate-plot').dxChart({
        palette: 'ocean',
        dataSource,
        commonSeriesSettings: {
            type: 'spline',
            argumentField: 'date',
        },
        commonAxisSettings: {
            grid: {
            visible: true,
            },
        },
        margin: {
            bottom: 20,
        },
        series: [
            { valueField: 'flow_rate', name: 'Gallons per Minute' },
        ],
        tooltip: {
            enabled: true,
        },
        legend: {
            verticalAlignment: 'top',
            horizontalAlignment: 'right',
        },
        export: {
            enabled: true,
        },
        argumentAxis: {
            label: {
                format: 'monthAndDay' // month
            },
            allowDecimals: false,
            tickInterval: 'day', // month
        },
        title: 'Flow Rate Over Time',
    }).dxChart('instance');

}


function create_live_gauge() {
    let gauge = $('#live-level-guage').dxCircularGauge({
          scale: {
            startValue: 0,
            endValue: 50,
            tickInterval: 1,
            label: {
              useRangeColors: true,
              customizeText(arg) {
                return `${arg.valueText} cm`;
              },
            },
          },
          rangeContainer: {
            palette: 'pastel',
            ranges: [
              { startValue: 0, endValue: 20 },
              { startValue: 20, endValue: 30 },
              { startValue: 30, endValue: 50 },
            ],
          },
          title: {
            text: 'Live Liquid Level',
            font: { size: 28 },
          },
          export: {
            enabled: true,
          },
          value: 0,
        }).dxCircularGauge('instance');
    return gauge;
}



function get_date_params() {
    let start_date = slider_start_date;
    let end_date = slider_end_date;
    var ONE_HOUR = 60 * 60 * 1000; /* ms */

    if (time_scale === timescales[0]) { // 1 hrs
        start_date = new Date();
        start_date.setTime(end_date.getTime() - (ONE_HOUR));
        return {'start_date': start_date, 'end_date': end_date};
    } else if (time_scale === timescales[1]) { // 12 hrs
        start_date = new Date();
        start_date.setTime(end_date.getTime() - (ONE_HOUR * 12));
        return {'start_date': start_date, 'end_date': end_date};
    } else if (time_scale === timescales[2]) { // 2 days 
        start_date = new Date();
        start_date.setDate(end_date.getDate() - 1);
        return {'start_date': start_date, 'end_date': end_date};

    } else if (time_scale === timescales[3]) { // 2 days 
        start_date = new Date();
        start_date.setDate(end_date.getDate() - 2);
        return {'start_date': start_date, 'end_date': end_date};

    } else if (time_scale === timescales[4]) { // 7 days
        start_date = new Date();
        start_date.setDate(end_date.getDate() - 7);
        return {'start_date': start_date, 'end_date': end_date};

    } else if (time_scale === timescales[5]) { // full
        // no-op, leave dates as is
        return {'start_date': start_date, 'end_date': end_date};

    } else if (time_scale === timescales[6]) { // all
        return {};
    }

    return {'start_date': start_date, 'end_date': end_date};
}

function convert_date_params(params) {
    let output = {};
    if (params['start_date']) {
        output['start_date'] = params['start_date'].toISOString();
    }
    if (params['end_date']) {
        output['end_date'] = params['end_date'].toISOString();
    }

    return output;
}

function create_range_selector()
{

    $("#history-reload-button").dxButton({
        text: "Reload",
        onClick: function() {
            console.log("Reload history");
            history_plots();
        }
    });

    $('#radio-group-time-scale').dxRadioGroup({
        items: timescales,
        value: timescales[0],
        layout: 'horizontal',
        onValueChanged: (e) => {
            console.log("Value Changed: ", e);
            time_scale = e.value;
        }
      });


    const cur_date = new Date();
    const start_date = new Date();
    start_date.setDate(cur_date.getDate() - 7); // should be set based on radio
    $(() => {
        $('#date-range-selector').dxRangeSelector({
          margin: {
            // top: 50,
          },
          scale: {
            startValue: new Date(2023, 12, 1),
            endValue: cur_date,
            minorTickInterval: 'day',
            tickInterval: 'week',
            minRange: 'day',
            maxRange: 'year',
            minorTick: {
              visible: false,
            },
          },
          sliderMarker: {
            format: 'monthAndDay',
          },
          onValueChanged: (e) => {
            // console.log(e.value);
            slider_start_date = e.value[0];
            slider_end_date = e.value[1];
          },
          value: [start_date, cur_date],
          title: 'Select a Data Range',
        });
      });
}


function history_plots() {
    const date_params = convert_date_params( get_date_params() );
    console.log("Date_Parms: ", date_params);
    $.ajax( {
        url: API_BASE_URL + "/history", 
        type: "GET",
        data: date_params,
        crossDomain: true,
        dataType: "json",
        success: function( historical_data ) {
            create_level_by_day(historical_data);
        }
    });

    $.ajax( {
        url: API_BASE_URL + "/runs_history", 
        type: "GET",
        data: date_params,
        crossDomain: true,
        dataType: "json",
        success: function( historical_data ) {
            create_runs_by_day(historical_data);
        }
    });

    $.ajax( {
        url: API_BASE_URL + "/flow_history", 
        type: "GET",
        data: date_params,
        crossDomain: true,
        dataType: "json",
        success: function( historical_data ) {
            create_flow_rate_plot(historical_data);
        }
    });
}



function update_gauge(gauge, data) {
    gauge.option('value', data.level);
}


let live_gauge;


function update_live_data()
{
    $.ajax( {
        url: API_BASE_URL + "/level", 
        type: "GET",
        crossDomain: true,
        dataType: "json",
        success: function( live_data ) {
            update_gauge(live_gauge, live_data);
        }
    });

}


// --------------------
//       Events
// --------------------
// Registering events that will get called

/** document ready
 * Called once page is loaded
 */ 
 $(document).ready(function() {
    live_gauge = create_live_gauge();
    create_range_selector()

    history_plots();
    update_live_data();
    window.setInterval(update_live_data, 5000);

});

