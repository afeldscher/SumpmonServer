


const API_BASE_URL="https://feldscher.dev/sumpmon/api"
// const API_BASE_URL=""


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


function create_live_gauge() {
    let gauge = $('#live-level-guage').dxCircularGauge({
          scale: {
            startValue: 0,
            endValue: 1000,
            tickInterval: 10,
            label: {
              useRangeColors: true,
            },
          },
          rangeContainer: {
            palette: 'pastel',
            ranges: [
              { startValue: 0, endValue: 400 },
              { startValue: 400, endValue: 700 },
              { startValue: 700, endValue: 1000 },
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


function history_plots() {

    $.ajax( {
        url: API_BASE_URL + "/history", 
        type: "GET",
        crossDomain: true,
        dataType: "json",
        success: function( historical_data ) {
            create_level_by_day(historical_data);
        }
    });

    $.ajax( {
        url: API_BASE_URL + "/runs_history", 
        type: "GET",
        crossDomain: true,
        dataType: "json",
        success: function( historical_data ) {
            create_runs_by_day(historical_data);
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

    history_plots();
    update_live_data();
    window.setInterval(update_live_data, 5000);

});

