// Java Script

// --------------------
//     Functions
// --------------------
// Plain old functions that will get called at some point


/** setup_nav
 * Sets up nav handlers
 * called in document ready by nav load callback
 */
function setup_nav() {
    $("body").click(function (event) {
        // only do this if navigation is visible, otherwise you see jump in navigation while collapse() is called 
        if ($(".navbar-collapse").is(":visible") && $(".navbar-toggle").is(":visible")) {
            $('.navbar-collapse').collapse('toggle');
            $('.navbar-toggle').removeClass('collapsed');
        }
    });

    $(".nav-link").click(function (event) {
        // only do this if navigation is visible, otherwise you see jump in navigation while collapse() is called 
        if ($(".navbar-collapse").is(":visible") && $(".navbar-toggle").is(":visible")) {
            $('.navbar-collapse').collapse('toggle');
            $('.navbar-toggle').removeClass('collapsed');
        }
    });
    
    $('.navbar-toggle').click(function () {
        var state = $('.navbar-collapse').attr('aria-expanded');
        if (state || state == undefined) {
            $(this).addClass('collapsed');
        }
        else {
            $(this).removeClass('collapsed');
        }
    });

    $('.socialIcony').hover(function (e) {
        $(e.target).fadeTo(300, 1);
        $('#' + e.target.id + '.socialIcon').fadeTo(300, 0);
    }, function (e) {
        $(e.target).fadeTo(300, 0);
        $('#' + e.target.id + '.socialIcon').fadeTo(300, 1);
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
    // Load Nav html. Call setup_nav when done loading. 
    $('#nav_target').load("nav_bar.html", setup_nav);

});


