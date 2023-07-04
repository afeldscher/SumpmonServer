


const API_BASE_URL="https://books.viggen.dev/noelle/books/api"
// const API_BASE_URL=""


function toggleVisibility(item) {
    if (item.isVisible()) {
      item.hide();
    } else {
      item.show();
    }
}


// --------------------------------
//            Data Grid
// --------------------------------

function create_books_grid(dataSource) {
    $('#books-grid').dxDataGrid({
        dataSource: dataSource,
        filterRow: { visible: true },
        searchPanel: { visible: true },
        keyExpr: 'id',
        // columnWidth: 100,
        columnAutoWidth: true,
        columns: [
            // { dataField: "datetime", dataType: "date", caption: "Date Submitted" },
            { dataField: "date_finished", dataType: "date", caption: "Date Finished", sortOrder: "desc" },
            { dataField: "reader", },
            { dataField: "genre", },
            { dataField: "title", },
            { dataField: "author", },
            { dataField: "finished", },
            { dataField: "read_duration", caption: "Read Days" },
            { dataField: "reread", },
            { dataField: "recommend", },
            { dataField: "series", },
            { dataField: "rating", },
            { dataField: "page_count", },
            { dataField: "notes", },
        ],
        showBorders: true,
        showRowLines: true,
        paging: {
            pageSize: 200,
        },
        pager: {
            visible: true,
            allowedPageSizes: [100, 200, 'all'],
            showPageSizeSelector: true,
            showInfo: true,
            showNavigationButtons: true,
        },
        scrolling: {
            // mode: 'virtual',
            // columnRenderingMode: 'virtual',
        },
        customizeColumns(columns) {
            columns[12].width = 300;
        },
        loadPanel: {
            enabled: true,
        },
        editing: {
            allowDeleting: true,
        },
        onRowRemoving: function(e) {
            var deferred = $.Deferred();
            console.log("Deleting ", e.key);
            delete_req = book_delete_request(e.key);
            delete_req.fail(() => {
                deferred.reject("Failed to Delete!");
                console.log("Delete Failed!");
            });
            delete_req.done(() => {
                deferred.resolve(false);
            });
            e.cancel = deferred.promise();
        },
        sorting: {
            mode: 'multiple',
        },
        onContentReady(e) {
            e.component.option('loadPanel.enabled', false);
        },
    });
}


// --------------------------------
//              Genre
// --------------------------------

function count_genres(books_data) {
    let genreDict = {};
    books_data.forEach((x) => { genreDict[x.genre] = (genreDict[x.genre] || 0) + 1;  });

    let genreArray = [];
    for (let g in genreDict) {
        genreArray.push({genre: g, books: genreDict[g]});
    }
    return genreArray;
}

function create_genre_pie_chart(books_data) {
    let dataSource = count_genres(books_data);
    
    $('#genre-pie').dxPieChart({
        // size: {
            // width: 500,
        // },
        palette: 'bright',
        dataSource: dataSource,
        series: [
            {
            argumentField: 'genre',
            valueField: 'books',
            label: {
                visible: true,
                connector: {
                visible: true,
                width: 1,
                },
            },
            },
        ],
        title: 'Books by Genre',
        export: {
            enabled: true,
        },
        onPointClick(e) {
            const point = e.target;

            toggleVisibility(point);
        },
        onLegendClick(e) {
            const arg = e.target;

            toggleVisibility(this.getAllSeries()[0].getPointsByArg(arg)[0]);
        },
    });
}


// --------------------------------
//            Pages Plot
// --------------------------------

function compare( a, b ) {
    if ( a.date_finished < b.date_finished ){
      return -1;
    }
    if ( a.date_finished > b.date_finished ){
      return 1;
    }
    return 0;
  }
  

function count_pages(books_data) {
    const sorted_books_data = books_data;
    sorted_books_data.sort(compare);
    let pagesDict = {};
    let readerTotals = {};
    sorted_books_data.forEach((x) => { 
        if (!pagesDict[x.date_finished]) {
            pagesDict[x.date_finished] = {};
        }
        readerTotals[x.reader] = (readerTotals[x.reader] || 0) + x.page_count;
        pagesDict[x.date_finished][x.reader] = readerTotals[x.reader]; 
    });

    let pagesArray = [];
    for (let p in pagesDict) {
        pagesArray.push(Object.assign({date: new Date(p)}, pagesDict[p]));
    }
    return pagesArray;
}

function create_pages_by_day(books_data) {
    let dataSource = count_pages(books_data);

    const chart = $('#pages-plot').dxChart({
        palette: 'violet',
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
            { valueField: 'Noelle', name: 'Noelle' },
            { valueField: 'Akweley', name: 'Akweley' },
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
                format: 'month'
            },
            allowDecimals: false,
            tickInterval: 'month',
        },
        title: 'Page Count Over Time',
    }).dxChart('instance');

}





// --------------------------------
//            Books Plot
// --------------------------------

function count_books(books_data) {
    const sorted_books_data = books_data;
    sorted_books_data.sort(compare);
    let booksDict = {};
    let readerTotals = {};
    sorted_books_data.forEach((x) => { 
        if (!booksDict[x.date_finished]) {
            booksDict[x.date_finished] = {};
        }
        readerTotals[x.reader] = (readerTotals[x.reader] || 0) + 1;
        booksDict[x.date_finished][x.reader] = readerTotals[x.reader]; 
    });

    let booksArray = [];
    for (let p in booksDict) {
        booksArray.push(Object.assign({date: new Date(p)}, booksDict[p]));
    }
    return booksArray;
}

function create_books_by_day(books_data) {
    let dataSource = count_books(books_data);

    const chart = $('#books-plot').dxChart({
        palette: 'violet',
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
            { valueField: 'Noelle', name: 'Noelle' },
            { valueField: 'Akweley', name: 'Akweley' },
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
                format: 'month'
            },
            allowDecimals: false,
            tickInterval: 'month',
        },
        title: 'Book Count Over Time',
    }).dxChart('instance');

}




// --------------------------------
//        Books per month Plot
// --------------------------------

function count_books_per_month(books_data) {
    const sorted_books_data = books_data;
    sorted_books_data.sort(compare);
    let booksDict = {};
    sorted_books_data.forEach((x) => { 
        let month = new Date(x.date_finished).toLocaleString('default', { month: 'long' });
        if (!booksDict[month]) {
            booksDict[month] = {};
        }
        booksDict[month][x.reader] = (booksDict[month][x.reader] || 0) + 1; 
    });

    let booksArray = [];
    for (let p in booksDict) {
        booksArray.push(Object.assign({date: p}, booksDict[p]));
    }
    return booksArray;
}

function create_books_per_month(books_data) {
    let dataSource = count_books_per_month(books_data);

    const chart = $('#books-by-month-plot').dxChart({
        palette: 'violet',
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
            { valueField: 'Noelle', name: 'Noelle' },
            { valueField: 'Akweley', name: 'Akweley' },
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
                format: 'string'
            },
            allowDecimals: false,
            // tickInterval: 'month',
        },
        title: 'Books Per Month',
    }).dxChart('instance');

}




function book_get_request() {

    $.ajax( {
        url: API_BASE_URL + "/books", 
        type: "GET",
        crossDomain: true,
        dataType: "json",
        success: function( books_data ) {
            create_books_grid(books_data);
            create_genre_pie_chart(books_data);
            create_pages_by_day(books_data);
            create_books_by_day(books_data);
            create_books_per_month(books_data);
        }
    });
}


function book_delete_request(id) {
   return $.ajax( {
        url: API_BASE_URL + "/books/" + id, 
        type: "DELETE",
        crossDomain: true,
        // dataType: "json",
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
    book_get_request();

});

