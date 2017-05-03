window.chaordic = {}

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
} else {
    alert('The File APIs are not fully supported in this browser.');
}
var reader;
var progress = document.querySelector('#progress_bar .percent')
var progress2 = document.querySelector('#progress_bar2 .percent')


function errorHandler(evt) {
    switch (evt.target.error.code) {
        case evt.target.error.NOT_FOUND_ERR:
            alert('File Not Found!');
            break;
        case evt.target.error.NOT_READABLE_ERR:
            alert('File is not readable');
            break;
        case evt.target.error.ABORT_ERR:
            break; // noop
        default:
            alert('An error occurred reading this file.');
    };
}

function updateProgress(evt) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
        var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded < 100) {
            progress.style.width = percentLoaded + '%';
            progress.textContent = "Uploading file (" + percentLoaded + '%)';
        }
    }
}

function handleFileSelect(evt) {
    // Reset progress indicator on new file selection.
    progress.style.width = '0%';
    progress.textContent = '0%';
    document.getElementById('progress_bar').style.display = 'block';

    reader = new FileReader();
    reader.onerror = errorHandler;
    reader.onprogress = updateProgress;
    reader.onabort = function(e) {
        alert('File read cancelled');
    };
    reader.onloadstart = function(e) {
        document.getElementById('progress_bar').className = 'loading';
    };
    reader.onload = function(e) {
        var content = e.currentTarget.result;

        // Ensure that the progress bar displays 100% at the end.
        progress.style.width = '100%';
        progress.textContent = "Uploading file (DONE)";
        setTimeout("document.getElementById('progress_bar').className='';", 2000);

        var json = form2json("#submission");
        json["csv"] = content;
        window.chaordic.json = json;
    }

    // Read in the image file as a binary string.
    reader.readAsBinaryString(evt.target.files[0]);
}

function form2json(form) {
    return jQuery(form).serialize().split('&').map(function(i) {
        return i.split('=');
    }).reduce(function(m, o) {
        m[o[0]] = o[1];
        return m;
    }, {});
}

function send2AWSLambda(json) {

    // Reset progress indicator on new file selection.
    progress2.style.width = '0%';
    progress2.textContent = '0%';
    document.getElementById('progress_bar2').className = 'loading';
    document.getElementById('progress_bar2').style.display = 'block';
    document.getElementById("submit-btn").style = "display:none;"
    document.getElementById("submit-loader").style = "display:block;"

    jQuery.ajax({
        xhr: function() {
            var xhr = new window.XMLHttpRequest();
            //Upload progress
            xhr.upload.addEventListener("progress", function(evt) {
                if (evt.lengthComputable) {
                    //Do something with upload progress
                    var percentComplete = Math.round((evt.loaded / evt.total) * 100);

                    // Increase the progress bar length.
                    if (percentComplete < 100) {
                        progress2.style.width = percentComplete + '%';
                        progress2.textContent = "Sending response (" + percentComplete + '%)';
                    }
                }
            }, false);
            return xhr;
        },
        type: 'POST',
        url: "https://h8rnb89m57.execute-api.us-east-1.amazonaws.com/draft/submission",
        data: JSON.stringify(json),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data) {
            window.chaordic.data = data
            document.getElementById("submit-loader").style = "display:none;"
            //show number of attempts remaining for today.
            if( data.error && data.error==="no-email"){
                document.getElementById("attempts").innerHTML = "We need your email!"
            }
            else if(data.attempts_limit_reached){
                document.getElementById("email-alert").innerHTML = "Sorry, you reached your limit of 3 submissions per day ... try again tomorrow!"
            }
            else{

                // Ensure that the progress bar displays 100% at the end.
                progress2.style.width = '100%';
                progress2.textContent = "Sending response (DONE)";
                setTimeout("document.getElementById('progress_bar2').className='';", 100);


                // show missclassification error and attempts.
                document.getElementById("email-alert").innerHTML = "Check your email :)"
                document.getElementById("attempts").innerHTML = "You have <b>" + data["attempts_left"] + "</b> attempts left for today!"
                document.getElementById("missclassificationerror").innerHTML = "You scored <br><br><br><font size='12'><b>" + String(100*data["score"]) + "%</font></b>"
            }


        }
    });
}

function triggerSendDataLambda(json) {
    json["getdata"] = true;
    document.getElementById("gimme-btn").style = "display:none;"
    document.getElementById("gimme-loader").style = "display:block;"
    jQuery.ajax({
        type: 'POST',
        url: "https://h8rnb89m57.execute-api.us-east-1.amazonaws.com/draft/submission",
        data: JSON.stringify(json),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data) {
            window.chaordic.data_getdata = data
            //show number of attempts remaining for today.
            if( data.error && data.error==="no-email"){
                document.getElementById("get-data-alert").innerHTML = "We need your email!"
                document.getElementById("gimme-btn").style = "display:block;"
                document.getElementById("gimme-loader").style = "display:none;"
            }
            else if(data.status && data.status == "ok!"){
                // show missclassification error and attempts.
                document.getElementById("get-data-alert").innerHTML = "Check your email :)"
                document.getElementById("gimme-loader").style = "display:none;"
            }


        }
    });
}

// listen for filelist updates.
document.getElementById("csv").addEventListener('change', handleFileSelect, false);

jQuery("#get-data").on("submit", function(event) {
    event.preventDefault();
    var json = form2json("#get-data");
    window.chaordic.json = json
    if(json && json.email && json.name) {
        triggerSendDataLambda(json);
    }
    else{
        document.getElementById("get-data-alert").innerHTML = "Fill out the entire form :)"
    }
});

jQuery("#submission").on("submit", function(event) {
    event.preventDefault();
    var global_json = window.chaordic.json || {};
    var json = form2json("#submission")
    json.csv = global_json.csv || null
    if(json && json.email && json.education && json.csv && json.cv) {
        send2AWSLambda(json);
    }
    else{
        document.getElementById("email-alert").innerHTML = "Fill out the entire form :)"
    }
});
