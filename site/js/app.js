/*
	Map: Object for displaying the USA states information
*/
function Map() {
	this.map = {};
	this.map.width = 800;
	this.map.height = 600;
	this.map.svg = null;
	this.map.tag = "";
	this.map.popUsaData = null;
	this.map.color = d3.scale.quantize()
						.range(["rgb(177,0,38)","rgb(227,26,28)","rgb(252,78,42)","rgb(253,141,60)",
							    "rgb(254,178,76)","rgb(254,217,118)","rgb(255,255,178)"]);
	this.map.color.domain([0,0]);

	this.map.projection = null;
	this.map.path = null;
}

Map.prototype = {
	constructor: Map,

	selectState: function(state){
		var states = d3.selectAll(".us-state")
						.classed("selected", false);
		var selectedState = states.filter(function(d){ return d.NAME == state.NAME });
		selectedState.classed("selected", true);
	},

	displayMapCallback: function(err, data) {
		if (err) console.error(err);

		var self = this;

		// Gets data for total population per state
		this.map.popUsaData = 
			data.filter(function(el){ return el.AGE == "999" && el.NAME !="United States" && el.SEX == "2" });

		// List of states (Needs to get data from popUsaData as the states are not repeated.)
		var states = d3.select("#states")
			   .selectAll("p")
				.data(this.map.popUsaData)
			    .enter().append("p")
			    .attr("class", "us-state")
			  	.text( function(d, i) { return d.NAME });
		states.on("click", function(d){ self.selectState(d); });

		this.map.color.domain([
				d3.min(this.map.popUsaData, function(d) { return d.POPEST2014_CIV; }), 
				d3.max(this.map.popUsaData, function(d) { return d.POPEST2014_CIV; })
			]);

		//Load in GeoJSON data
		var self = this;
		d3.json("./data/us-states.json", function(json) {

			for (var i = 0; i < self.map.popUsaData.length; i++) {
				var popState = self.map.popUsaData[i].NAME;

				for (var j = 0; j < json.features.length; j++) {
					var jsonState = json.features[j].properties.name;

					if (popState == jsonState) {
						//Copy the data value into the JSON
						json.features[j].properties.estbase2010 = self.map.popUsaData[i].ESTBASE2010_CIV;
						json.features[j].properties.popest2010 = self.map.popUsaData[i].POPEST2010_CIV;
						json.features[j].properties.popest2011 = self.map.popUsaData[i].POPEST2011_CIV;
						json.features[j].properties.popest2012 = self.map.popUsaData[i].POPEST2012_CIV;
						json.features[j].properties.popest2013 = self.map.popUsaData[i].POPEST2013_CIV;
						json.features[j].properties.popest2014 = self.map.popUsaData[i].POPEST2014_CIV;
						
						//Stop looking through the JSON
						break;
					};
				}
			}

			//Bind data and create one path per GeoJSON feature
			self.map.svg.selectAll("path")
			   .data(json.features)
			   .enter()
			   .append("path")
			   .attr("d", self.map.path)
			   .style("fill", function(d) {
			   		var popValue = d.properties.popest2014;

			   		if (popValue)
			   			return self.map.color(popValue);
			   		else
			   			return "#ccc"
			   })
			   .style("stroke", "#969696");
		});
	},

	init: function(target) {
		this.map.tag = target;
		var x = d3.select(this.map.tag).style("width");

		var margin = {top: 10, right: 10, bottom: 20, left: 10};
		var width = parseInt(x) - margin.left - margin.right,
			mapRatio = 0.5,
			height = mapRatio * width;

		// Define the map selector projection
		this.map.projection = d3.geo.albersUsa()
							.translate([this.map.width/2, this.map.height/2])
							.scale([1000]);

		// Define the geo path generator
		this.map.path = d3.geo.path()
					 .projection(this.map.projection);

		this.map.svg = d3.select(target).append("svg")
			.attr({
				width: width + margin.left + margin.right,
				height: height + margin.top + margin.bottom,
				viewBox: "0 0 " + this.map.width + " " + this.map.height,
				preserveAspectRatio: "xMinYMin meet"
			})
		  .append("g")
		    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var self = this;
		d3.csv("./data/usa_data_10y.csv", function(err, data) {
			self.displayMapCallback(err, data);
		});
	}
};

function Dashlet(name, pieDashletId, barDashletId, bar, pie, type){
	this.name = name;
	this.pieDashletId = pieDashletId;
	this.barDashletId = barDashletId;
	this.bar = bar;
	this.pie = pie;
	this.type = type;	// Country or state
}

Dashlet.prototype = {
	constructor: Dashlet,

	init: function(){
		var self = this;
		self.bar.init();
		self.pie.init();
	},

	updateRange: function(agesRange){
		var self = this;
		self.bar.update(self.bar.bchart.year, self.bar.bchart.zone, agesRange);
		self.pie.update(self.pie.pie.year, self.pie.pie.zone, agesRange);
	},

	updateEvents: function(event){
		var self = this;
		self.bar.addEvent(event);
		self.pie.addEvent(event);		
	},

	updateYear: function(year){
		var self = this;
		self.bar.update(year, self.bar.bchart.zone, self.bar.bchart.agesRange);
		self.pie.update(year, self.pie.pie.zone, self.bar.bchart.agesRange);		
	}
}


//Application
function App(mapTag, statesTag) {
	this.app = {};
	this.app.map = null;
	this.app.values = [];
	this.app.countries = ["Peru", "Uruguay", "Japan", "Germany", "Mexico"];
	this.app.events = null;
	this.app.selectedEvents = [];

	this.app.tagMap = mapTag;
	this.app.tagStates = statesTag;

	this.app.data1yUsa = null;
	this.app.data10yUsa = null;
	this.app.data1yInt = null;
	this.app.data10yInt = null;
};

App.prototype = {
	constructor: App,

	initStates: function(){
		var self = this,
			app = this.app;

		var population = 
			app.data10yUsa.filter(function(el){ return el.AGE == "999" && el.NAME !="United States" && el.SEX == "2" });

		var states = d3.select(app.tagStates)
			   .selectAll("p")
				.data(population)
			    .enter().append("p")
			    .attr("class", "us-state")
			  	.text( function(d, i) { return d.NAME });
		states.on("click", function(d){ self.updateValues(d.NAME, "state"); });

		var usa = ["United States"];
		d3.select("#cont-btn-usa")
			  .selectAll("button")
			.data(usa).enter()
			  .append("button")
			  .attr("type", "button")
			  .attr("id", "btn-UnitedStates")
			  .attr("class", "btn btn-default btn-lg btn-country")
			  .html(function(d){ return d; })
			  .on("click", function(d){
			  	self.updateValues(d, "country");
			  });
	},

	updateValues: function(element, typeZone){
		var self = this,
			app = this.app,
			addElement = true,
			states = d3.selectAll(".us-state");

		// If the element is not in the list, add it. Otherwise, remove it.
		for(var k = 0; k < app.values.length; k++)
			if (app.values[k].name == element){
				// Remove the selected tag from the state selection list
				states.filter(function(d){ return d.NAME == element }).classed("selected", false);
				// Free the dashlet div
				var pieDashletContainer = d3.select(app.values[k].pieDashletId);
				pieDashletContainer.classed("free_pc", true);

				var barDashletContainer =d3.select(app.values[k].barDashletId);
				barDashletContainer.classed("free_bc", true);

				pieDashletContainer.select("svg").remove();
				barDashletContainer.select("svg").remove();
				
				app.values.splice(k,1);
				addElement = false;

				// If country remove style
				if (typeZone == "country"){
					var btn = d3.selectAll("#btn-" + element.trim());
					btn.classed("btn-primary", false);
					btn.classed("btn-default", true);
				}

				break;
			};

		if (addElement && app.values.length < 4){
			// Mark the state CSS as selected
			states.filter(function(d){ return d.NAME == element })
				.classed("selected", true);

			var pieDashletId = self.getDashletContainerId("pie"),
			    barDashletId = self.getDashletContainerId("bar");
			var pieDashletContainer = d3.select(pieDashletId);
			pieDashletContainer.classed("free_pc", false);
			var barDashletContainer = d3.select(barDashletId);
			barDashletContainer.classed("free_bc", false);

			// Add element to the values to show in dashboard
			// Element from a international country?
			var data1y = null,
				data10y = null;
			if (typeZone == "country" && element != "United States"){
				data1y = app.data1yInt;
				data10y = app.data10yInt;
			} else {
				data1y = app.data1yUsa;
				data10y = app.data10yUsa;
			}

			var pie = new PieChart(data1y, data10y, 2014, element, 10, pieDashletId, typeZone),
			    bar = new BarChart(data1y, data10y, 2014, element, 10, barDashletId, typeZone),
			    dashlet = new Dashlet(element, pieDashletId, barDashletId, bar, pie);
			app.values.push(dashlet);
			dashlet.init();

			// If country add style
			if (typeZone == "country"){
				var btn = d3.selectAll("#btn-" + element.trim().replace(" ",""));
				btn.classed("btn-default", false);
				btn.classed("btn-primary", true);
			};
		}
	},

	selectEvent: function(event){
		var self = this,
			app = this.app,
			addEvent = true;

		for(var k = 0; k < app.selectedEvents.length; k++){
			if (app.selectedEvents[k].id == event.id){
				app.selectedEvents.splice(k,1);
				d3.selectAll(".event-item").filter(function(d){ return d.id == event.id })
					.classed("selected", false);
				addEvent = false;

				for(var j = 0; j < app.values.length; j++){
					app.values[j].updateEvents(event);
				}
			}
		}

		if (addEvent && app.selectedEvents.length < 10){
			app.selectedEvents.push(event);
			d3.selectAll(".event-item").filter(function(d){ return d.id == event.id })
				.classed("selected", true);

			for(var j = 0; j < app.values.length; j++){
				app.values[j].updateEvents(event);
			}
		}
	},

	/*
		Get the divs designated for the dashlet that are marked with
		the "free" class. Get the first one as elements are sorted
		by id.
	*/
	getDashletContainerId: function(type){
		var app = this.app,
			dashlets = null;

		if (type == "bar") dashlets = d3.selectAll(".free_bc");
		else dashlets = d3.selectAll(".free_pc");

		if (dashlets != null && dashlets[0].length > 1)
			return "#" + dashlets[0][0].id;
	},

	createCountries: function(){
		var app = this.app,
			self = this;

		d3.select("#countries")
			.selectAll("div")
			.data(app.countries)
		  .enter().append("div")
		  	.attr("class", "btn-group")
			.attr("role", "group")
		  .append("button")
		    .attr("id", function(d){ return "btn-" + d.trim() })
			.attr("type", "button")
			.attr("class", "btn btn-default btn-lg btn-country")
			.html(function(d){ return d; })
			.on("click", function(d){
				self.updateValues(d, "country");
			});
	},

	createEvents: function(){
		var self = this, 
			app = this.app;

		app.events = [
			{
				id : 1,
				name: "Maracanazo",
				year: 1950,
				place: "Brazil",
				url: "http://www.youtube.com/watch?v=oOMwUpVgYt4"
			},
			{
				id : 2,
				name: "Dennis Bergkamp touches the sky",
				year: 1998,
				place: "France",
				url: "https://youtu.be/XsZkCFoqSBs"
			},
			{
				id : 3,
				name: "Barcelona reach a crescendo in the Clasico",
				year: 2010,
				place: "Spain",
				url: ""
			},
			{
				id : 4,
				name: "The miracle of Istanbul",
				year: 2005,
				place: "Turkey",
				url: "http://www.youtube.com/watch?v=b1i_xovIohY"
			},
			{
				id : 5,
				name: "Manchester United win it in a minute",
				year: 1999,
				place: "Spain",
				url: "http://www.youtube.com/watch?v=W0rzRvjCM6Q"
			},
			{
				id : 6,
				name: "The Hand of God",
				year: 1986,
				place: "Mexico",
				url: "http://www.youtube.com/watch?v=9QIel8kebFs"
			},
			{
				id : 7,
				name: "The match of the century",
				year: 1970,
				place: "Mexico",
				url: "https://youtu.be/lKlf38gmvOY"
			},
			{
				id : 8,
				name: "North Korea knock out Italy",
				year: 1966,
				place: "England",
				url: "http://www.youtube.com/watch?v=Mqp3Xa5IR_I"
			},
			{
				id : 9,
				name: "Iniesta decides it for Dani",
				year: 2010,
				place: "South Africa",
				url: "https://youtu.be/bVN5zo4KHR4"
			},
			{
				id : 10,
				name: "Baggio raises the bar... and the aims too high",
				year: 1994,
				place: "United States",
				url: "http://www.youtube.com/watch?v=ldY502gnb0E"
			},
			{
				id : 11,
				name: "Zidane loses his head",
				year: 2006,
				place: "Germany",
				url: "https://youtu.be/-L8z830KuxA"
			},
			{
				id : 12,
				name: "Roberto Carlos's free-kick against France",
				year: 1997,
				place: "France",
				url: "https://youtu.be/oGeMZ3t8jn4"
			},
			{
				id : 13,
				name: "Last peruvian match in a World Cup",
				year: 1982,
				place: "Spain",
				url: ""
			}
		];

		var soccerEvents = d3.select("#event-list")
				.selectAll("li")
				.data(app.events)
			.enter().append("li")
			    .attr("class", "list-group-item event-item")
			  	.text( function(d, i) { return d.name })
			  	.on("click", function(d){ self.selectEvent(d); })
			.append("span")
				.attr("class", "badge event-year")
				.text( function(d){ return d.year })
	},

	createYearsControllers: function(){
		var years = [2010, 2011, 2012, 2013, 2014],
			app = this.app;

		d3.select("#dashboard-control-2")
			  	.selectAll("div").data(years).enter()
			.append("div")
				.attr("class", "btn-group")
				.attr("role", "group")
			.append("button")
				.attr("type", "button")
				.attr("class", function(d){
					if (d == 2014) return "btn btn-primary btn-lg age-range";
					else return "btn btn-default btn-lg age-range";
				})
				.html(function(d){ return d; })
				.on("click", function(d){
					var buttons = d3.select("#dashboard-control-2").selectAll("button");
					buttons.classed("btn-primary", false).classed("btn-default", true);
					buttons.filter(function(e){ return e == d}).classed("btn-primary", true);

					for(var i = 0; i < app.values.length; i++)
						app.values[i].updateYear(d);
				});
	},

	init: function() {
		var self = this,
			app = this.app;

		// Load data from Census (10 years range)
		d3.csv("./data/usa_data_10y.csv", function(err, data10y){
			//TO DO: control error.
			app.data10yUsa = data10y;

			// Load data from Census (1 year range)
			d3.csv("./data/usa_data_1y.csv", function(err, data1y){
				//TO DO: control error.
				app.data1yUsa = data1y;

				d3.csv("./data/int_data_1y.csv", function(err, data1y){
					app.data1yInt = data1y;

					d3.csv("./data/int_data_10y.csv", function(err, data10y){
						app.data10yInt = data10y;

						self.initStates();
						self.createCountries();
						self.createEvents();
						self.createYearsControllers();
					});
				});
			});
		});
	}
};