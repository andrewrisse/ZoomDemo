//Zoom API integration prototype for CSCI577a project
//Create a tutor session with Zoom API
//Get list of scheduled meetings

var express 	= require("express"),
	bodyParser 	= require("body-parser"),
	request		= require("request"),
	http 		= require("https");
var app = express();
const zoomclientid = "ENTER ZOOM CLIENTID HERE"; 
const zoomclientsec = "ENTER ZOOM SECURITY KEY HERE";

var appURL = "https://webdeveloperbootcamp-poanr.run-us-west1.goorm.io/tutorClassroom";
var userID = "team2eola@gmail.com";
const myappredirect = appURL + "/meetings/getToken";
accessToken = "";
refreshToken = "";

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));


// =================================================================
// ROUTES
// Order of operations:
// 1. Load "/tutorClassroom
// 2. Get Authorization Code 
// 3. Get Authorization Token
// 4. List current scheduled classes
// 5. Upon click to create new tutor session: load /new page
// 6. Post new session with Zoom API
// 7. Go back to tutorClassroom page
// =================================================================

//Landing page
app.get("/", function(req, res){
	res.render("index");
});

//Show page for tutorClassroom, lists scheduled sessions
app.get("/tutorClassroom", function(req, res){
		
	if(accessToken === ""){ //Get an accessToken first
		res.redirect("/tutorClassroom/meetings/getCode");
	}
	else{//Display all current meetings
		getMeetingList(function(result) {
			res.render("tutorClassroom/index.ejs", {meetings: result});
  		});
		
	}
});



//CREATE - show form to create new tutor session
app.get("/tutorClassroom/meetings/new", function(req, res){
	res.render("tutorClassroom/meetings/new");
});



//Get Access Code
app.get("/tutorClassroom/meetings/getCode", function(req, res){
		//get an access code 
	
		const myappredirect = appURL + "/meetings/getToken"; 
		const zoomauth = "https://zoom.us/oauth/authorize" + "?response_type=code&client_id=" + zoomclientid + "&redirect_uri=" + myappredirect; 	
		res.redirect(zoomauth); //Get authorization code, redirect to get Access Token next
	
});

//Get an Access Token
app.get("/tutorClassroom/meetings/getToken", function(req, res){
	
	const zoomtokenep = "https://zoom.us/oauth/token";    
	
    if (req.query.code) {
		 var auth = "Basic " + new Buffer(zoomclientid + ':' +
            zoomclientsec).toString('base64');
	
        var url = zoomtokenep + '?grant_type=authorization_code&code=' +
            req.query.code + '&redirect_uri=' + myappredirect;
	
		//ZOOM authorization token API call
		request.post({
            url: url,
            headers: {
                "Authorization": auth
            }
        }, function(error, response, body) {
            if (error) {
                console.log("Error when getting Zoom token: " + error);
                return;
            }
            body = JSON.parse(body);

            if (body.access_token) {
                accessToken = body.access_token;
				refreshToken = body.refresh_token;
				console.log("Access Token: " + accessToken);
                // Process and securely store these tokens here- TO BE IMPLEMENTED
				res.redirect("/tutorClassroom"); 
				
            } else {
                console.log("FATAL - could not get zoom token");
            }
            return;
        });

    } else {
        console.log("Missing auth code from Zoom");
    }
});

//CREATE - create a new meeting in Zoom using API
app.post("/tutorClassroom/meetings/createMeeting", function(req, res){
	

	var auth = "Bearer " + accessToken;
	var topic = req.body.topic;
	var start_time = req.body.start_time + ":00"; //add seconds to end
	
	var duration = req.body.duration;
	var path = "/v2/users/" +userID +"/meetings"

	var options = {
	  "method": "POST",
	  "hostname": "api.zoom.us",
	  "port": null,
	  "path": path, 
	  "headers": {
		"content-type": "application/json",
		"authorization": auth
	  }
	};

	var req = http.request(options, function (res) {
	  var chunks = [];

	  res.on("data", function (chunk) {
		chunks.push(chunk);
	  });

	  res.on("end", function () {
		var body = Buffer.concat(chunks);
		
		
	  });
	});

	req.write(JSON.stringify({
	  duration: duration,
	  settings: {
		host_video: true,
		participant_video: true,
		join_before_host: false,
		mute_upon_entry: false,
		watermark: false,
		approval_type: 0,
		audio: 'Both',
		auto_recording: 'none',
		enforce_login: false
	  },
		start_time: start_time,   
		topic: topic
	}));
	console.log("Create Meeting Status code: " + res.statusCode);
	req.end();
	res.redirect("/tutorClassroom"); 
});



//TO BE IMPLEMENTED
app.get("/studentClassroom", function(req, res){
	res.send("studentClassroom");
});

//Uses Zoom API to get a list of scheduled meetings
function getMeetingList(callback){ 

	var auth = "Bearer " + accessToken;
	
	var listMeetingsURL = "https://api.zoom.us/v2/users/" + userID + "/meetings?page_number=1&page_size=100&type=upcoming"; //max of 100 "upcoming" meetings
	request.get({ //get list of meetings
		url: listMeetingsURL,
		headers: {
			"Authorization": auth
		}
	}, function(error, response, body) {
			if (error) {
				res.redirect("/tutorClassroom/meetings/getCode"); //get new Access Code and Token
			}
			 
			var meetingsArr = new Array (JSON.parse(body).meetings);
			
			var meetings = [];
			meetingsArr[0].forEach(function(meeting){
				meetings.push(meeting);
			});
			
			callback(meetings);
		});
	
	
}



//Tell Express to listen for requests (start server)
app.listen(process.env.PORT || 3000, process.env.IP, function(){
	console.log("Server has started!");
});
