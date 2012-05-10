/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets */

/**
 * This is a collection of utility functions for gathering performance data.
 */
define(function (require, exports, module) {
    'use strict';
    
    /**
     * Peformance data is stored in this hash object. The key is the name of the
     * test (passed to markStart/addMeasurement), and the value is the time, in 
     * milliseconds, that it took to run the test. If multiple runs of the same test
     * are made, the value is an Array with each run stored as an entry in the Array.
     */
    var perfData = {};
    
    /**
     * Active tests. This is a hash of all tests that have had markStart() called,
     * but have not yet had addMeasurement() called.
     */
    var activeTests = {};

    /**
     * Updatable tests. This is a hash of all tests that have had markStart() called,
     * and have had updateMeasurement() called. Caller must explicitly remove tests
     * from this list using finalizeMeasurement()
     */
    var updatableTests = {};
    
    /**
     * Private helper function for markStart()
     */
    function _markStart(name, time) {
        if (activeTests[name]) {
            console.log("Recursive tests with the same name are not supported.");
            return;
        }
        
        activeTests[name] = { startTime: time };
    }
    
    /**
     * Start a new named timer. The name should be as descriptive as possible, since
     * this name will appear as an entry in the performance report. 
     * For example: "Open file: /Users/brackets/src/ProjectManager.js"
     *
     * Multiple timers can be opened simultaneously, but all open timers must have
     * a unique name. 
     */
    function markStart(name) {
        var time = brackets.app.getElapsedMilliseconds();

        // Array of names can be passed in to have multiple timers with same start time
        if (Array.isArray(name)) {
            var i;
            for (i = 0; i < name.length; i++) {
                _markStart(name[i], time);
            }
        } else {
            _markStart(name, time);
        }
    }
    
    /**
     * Stop a timer and add its measurements to the performance data.
     *
     * Multiple measurements can be stored for any given name. If there are
     * multiple values for a name, they are stored in an Array.
     *
     * If markStart() was not called for the specified timer, the
     * measured time is relative to app startup.
     */
    function addMeasurement(name) {
        var elapsedTime = brackets.app.getElapsedMilliseconds();
        
        if (activeTests[name]) {
            elapsedTime -= activeTests[name].startTime;
            delete activeTests[name];
        }
        
        if (perfData[name]) {
            // We have existing data, add to it
            if (Array.isArray(perfData[name])) {
                perfData[name].push(elapsedTime);
            } else {
                // Current data is a number, convert to Array
                perfData[name] = [perfData[name], elapsedTime];
            }
        } else {
            perfData[name] = elapsedTime;
        }
    }

    /**
     * This function is similar to addMeasurement(), but it allows timing the
     * *last* event, when you don't know which event will be the last one.
     *
     * Tests that are in the activeTests list, have not yet been added, so add
     * measurements to the performance data, and move test to updatableTests list.
     * A test is moved to the updatable list so that it no longer passes isActive().
     *
     * Tests that are already in the updatableTests list are updated.
     *
     * Caller must explicitly remove test from the updatableTests list using
     * finalizeMeasurement().
     *
     * If markStart() was not called for the specified timer, there is no way to
     * determine if this is the first or subsequent call, so the measurement is
     * not updatable, and it is handled in addMeasurement().
     */
    function updateMeasurement(name) {
        var elapsedTime = brackets.app.getElapsedMilliseconds();

        if (updatableTests[name]) {
            // update existing measurement
            elapsedTime -= updatableTests[name].startTime;
            
            // update
            if (perfData[name] && Array.isArray(perfData[name])) {
                // We have existing data and it's an array, so update the last entry
                perfData[name][perfData[name].length - 1] = elapsedTime;
            } else {
                // No current data or a single entry, so set/update it
                perfData[name] = elapsedTime;
            }
            
        } else {
            // not yet in updatable list

            if (activeTests[name]) {
                // save startTime in updatable list before addMeasurement() deletes it
                updatableTests[name] = { startTime: activeTests[name].startTime };
            }
            
            // let addMeasurement() handle the initial case
            addMeasurement(name);
        }
    }

    /**
     * Remove timer from lists so next action starts a new measurement
     * 
     * updateMeasurement may not have been called, so timer may be
     * in either or neither list, but should never be in both.
     */
    function finalizeMeasurement(name) {
        if (activeTests[name]) {
            delete activeTests[name];
        }
        if (updatableTests[name]) {
            delete updatableTests[name];
        }
    }
    
    /**
     * Return whether a timer is active or not.
     */
    function isActive(name) {
        return (activeTests[name]) ? true : false;
    }

    exports.addMeasurement          = addMeasurement;
    exports.finalizeMeasurement     = finalizeMeasurement;
    exports.isActive                = isActive;
    exports.markStart               = markStart;
    exports.perfData                = perfData;
    exports.updateMeasurement       = updateMeasurement;
});
