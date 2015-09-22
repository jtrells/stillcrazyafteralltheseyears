/* Class for creating a pie chart object. It can store the data for 1 year range and 10 years range */

function PieChart(data1y, data10y, year, zone, agesRange, target, typeZone){
	this.pie = {};
	this.pie.margin = {top: 40, right: 10, bottom: 40, left: 80};
	this.pie.height = 0;			// SVG height
	this.pie.width = 0;				// SVG width
	this.pie.radius = 0;			// Radius of the pie chart
	this.pie.innerRadius = 0;
	this.pie.tweenDuration = 500;
	this.pie.color = null;			// Color range for pie elements
	this.pie.arc = null;			// SVG pie outer and inner arc
	this.pie.chart = null			// SVG pie layout

	this.pie.year = year;			// Filter the pie by year
	this.pie.zone = zone;			// Filter the pie by state/country
	this.pie.total = null;			// Object filtering total data per zone
	this.pie.agesRange = agesRange; // Range of ages used to show the data
	this.pie.typeZone = typeZone;	// state or country

	// Events associated with population [0-9]
	this.pie.events = [null, null, null, null, null,null, null, null, null, null];

	this.pie.svg = null;			// SVG element
	this.pie.data = null;			// Stores the filtered data
	this.pie.data1y = data1y;
	this.pie.data10y = data10y;

	this.pie.tag = target;			// Target element where the chart is located
	this.pie.tooltip = null;
	this.pie.eventTooltip = null;

	this.pie.ytransStatePop = 0;
	this.pie.ytransYear = 0;

}

PieChart.prototype = {
	constructor: PieChart,

	filterData: function(){
		var self = this
			pie = this.pie;

		if (pie.agesRange == 1){
			pie.data = 
				pie.data1y.filter(function(el){ return el.AGE != "999" && el.NAME == pie.zone && el.SEX == "0" });
			pie.total = 
				pie.data1y.filter(function(el){ return el.AGE == "999" && el.NAME == pie.zone && el.SEX == "0" })[0];
		} else{
			pie.data = 
				pie.data10y.filter(function(el){ return el.AGE != "999" && el.NAME == pie.zone && el.SEX == "0" });
			pie.total = 
				pie.data10y.filter(function(el){ return el.AGE == "999" && el.NAME == pie.zone && el.SEX == "0" })[0];			
		}
	},

	/* Utility function for getting the total amount of people between a range  
	*/
	getTotalPeople: function(startAge, endAge){
		var self = this,
			pie = this.pie;

		var filterData = pie.data1y.filter(function(el){ 
							return parseInt(el.AGE) >= startAge && parseInt(el.AGE) <= endAge 
									&& el.NAME == pie.zone && el.SEX == "0"; 
						 });

		var total = 0;
		for(i = 0; i < filterData.length; i++){
			total += parseInt(self.populationYear(filterData[i], pie.year));
		}
		return total;
	},

	/* Creates a new pie chart. If the age range is called, the chart is recreated 
	*/
	create: function(){
		var self = this
			pie = this.pie,
			formatter = d3.format(",.0f");
		
		// Remove any event arc, thy will be added back at the end.
		pie.svg.selectAll(".event_arc").remove();

		self.filterData();

		var path = pie.svg.selectAll("path")
				  .data(pie.chart(pie.data));
		path.enter().append("path")
			  .attr("class", "arc")
			  .attr("d", pie.arc)
			  .style("fill", function(d){ return pie.color(d.data.AGE) })
			  .each(function(d){ this._current = d; });

		path.on("mouseover", function(d){
			var ageLabel = d.data.AGE;
			if (ageLabel == "85")
				ageLabel = "85+";

			var population = self.populationYear(d.data, pie.year);
			var total = self.populationYear(pie.total, pie.year);
			var percent = Math.round(1000 * population / total)/10;

			pie.tooltip.select(".piett_label").html("Ages: " + ageLabel);
			pie.tooltip.select(".piett_count").html(formatter(population) + " ppl");
			pie.tooltip.select(".piett_percent").html(percent + "%");
			pie.tooltip.style("display", "block");
			pie.tooltip.style("top", (d3.event.pageY + 10) + "px");
			pie.tooltip.style("left", (d3.event.pageX + 10) + "px");
		});
		path.on("mouseout", function(d){
			pie.tooltip.style("display","none");
		});
		path.transition()
			.duration(500)
			.attrTween("d", function(d) {
		      var interpolate = d3.interpolate(this._current, d);
		      this._current = interpolate(0);
		      return function(t) {
		        return pie.arc(interpolate(t));
		      };
			});
		path.exit().remove();	

		if (pie.agesRange == 10){
			var textGroup = pie.svg.append("g")
							.attr("class", "slices_labels");

			var text = textGroup.selectAll("text")
					.data(pie.chart(pie.data));

			text.enter()
				.append("text")
				.text(function(d){ 
					return d.data.AGE 
				})
				.attr("class", "slice_label")
				.attr("transform", function(d) {
					return "translate(" + 
						Math.cos(((d.startAngle+d.endAngle - Math.PI)/2)) * (pie.radius+5) + "," + 
						Math.sin((d.startAngle+d.endAngle - Math.PI)/2) * (pie.radius+5) + ")";
					})
					.attr("dy", function(d){
				        if ((d.startAngle+d.endAngle)/2 > Math.PI/2 && (d.startAngle+d.endAngle)/2 < Math.PI*1.5 ) {
				          return 5;
				        } else {
				          return -7;
				        }
			     })
					.attr("text-anchor", function(d){
			        if ((d.startAngle+d.endAngle)/2 < Math.PI )
			          return "beginning";
			        else
			          return "end";
				});
			text.exit().remove();
		} else{
			pie.svg.selectAll(".slice_label").remove();
		}	

		// Update the State information for the pie chart
		var total = self.populationYear(pie.total, pie.year);
		pie.svg.select(".state_name")
			.text(pie.zone);
		pie.svg.select(".state_pop")
			.text(formatter(total) + " ppl");
		pie.svg.select(".state_year")
			.text(pie.year);

		// Look for any Event Arcs and update start angles
		for(k = 0; k < pie.events.length; k++)
			if (pie.events[k] != null) {
				self.drawEventArc(pie.events[k], k);
			}
	},

	/* As the year data is stored in different columns, this helper function allows
	   to get the age column for a given year 
	*/
	populationYear: function(d, year){
		switch(year) {
			case 2010:
				return d.POPEST2010_CIV;
			case 2011:
				return d.POPEST2011_CIV;
			case 2012:
				return d.POPEST2012_CIV;	
			case 2013:
				return d.POPEST2013_CIV;
			case 2014:
				return d.POPEST2014_CIV;
			default:
				return d.POPEST2014_CIV;
		}
	},

	/* Calculates the mid angle 
	*/
	midAngle: function(d){
		return d.startAngle + (d.endAngle - d.startAngle)/2;
	},

	/* Updates the chart information. If the age range is not changed, the update
	   consists of filtering the existing data with a different year or place.
	*/
	update: function(year, zone, agesRange){

		var self = this;
		var pie = this.pie;
		var oldRange = pie.agesRange;

		pie.zone = zone;
		pie.year = year;
		pie.agesRange = agesRange;

		if (pie.agesRange != oldRange){
			self.create();
		} else {
			self.filterData();
			var total = self.populationYear(pie.total, pie.year);
			var formatter = d3.format(",.0f");

			var path = pie.svg.selectAll("path").data(pie.chart(pie.data));
			path.transition()
				.duration(500)
				.attrTween("d", function(d) {
			      var interpolate = d3.interpolate(this._current, d);
			      this._current = interpolate(0);
			      return function(t) {
			        return pie.arc(interpolate(t));
			      };
			    });

			var labels = pie.svg.selectAll(".slice_label").data(pie.chart(pie.data));
			labels.transition().duration(500)
				.attrTween("transform", function(d) {
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						var pos = pie.arc.centroid(d2);
						pos[0] = pie.radius * (self.midAngle(d2) < Math.PI ? 1 : -1);
						return "translate(" + 
	        					Math.cos(((d.startAngle+d.endAngle - Math.PI)/2)) * (pie.radius+5) + "," + 
	        					Math.sin((d.startAngle+d.endAngle - Math.PI)/2) * (pie.radius+5) + ")";
					};
				})
				.styleTween("text-anchor", function(d){
					this._current = this._current || d;
					var interpolate = d3.interpolate(this._current, d);
					this._current = interpolate(0);
					return function(t) {
						var d2 = interpolate(t);
						return self.midAngle(d2) < Math.PI ? "start":"end";
					};
				});
			labels.exit().remove();

			pie.svg.select(".state_name")
					.text(pie.zone);
			pie.svg.select(".state_pop")
					.text(formatter(total) + " ppl");
			pie.svg.select(".state_year")
					.text(pie.year);	

			// Look for any Event Arcs and update start angles
			pie.svg.selectAll(".event_arc").remove();
			for(k = 0; k < pie.events.length; k++)
				if (pie.events[k] != null) {
					self.drawEventArc(pie.events[k], k);
				}
		}
	},

	/* Resizes the graph 
	*/
	resize: function(){
		var self = this;
		var pie = this.pie;

		var x = d3.select(pie.tag).style("width");
		var y = d3.select(pie.tag).style("height");

		pie.width = parseInt(x) - pie.margin.left - pie.margin.right,
		pie.height = parseInt(y) - pie.margin.top - pie.margin.bottom;

		// Resize pie chart
		pie.radius = Math.min(pie.width, pie.height)/2;
		var svg = d3.select("svg").attr({
			width:  pie.width + pie.margin.left + pie.margin.right,
			height: pie.height + pie.margin.top + pie.margin.bottom
		});

		svg.select("g")
			.attr("transform", "translate(" + pie.width/2 + "," + (pie.height/2 + 30) + ")");

		pie.arc = d3.svg.arc()
			.outerRadius(pie.radius - 10)
			.innerRadius(pie.radius / 2);

		pie.chart = d3.layout.pie()
			.sort(null)
			.value(function(d){ return self.populationYear(d, pie.year); });

		svg.selectAll(".slice_label")
			.attr("transform", function(d){
				var c = pie.arc.centroid(d);
				x = c[0];
				y = c[1];
				h = Math.sqrt(x*x + y*y);
				tr = "translate(" + ((x/h) * (pie.radius + 10)) + ","
						+ ((y/h) * pie.radius + 10) +")";
				return tr;
			})
			.attr("text-anchor", function(d){ 
				return (d.endAngle + d.startAngle)/2 > Math.PI ? "end" : "start";
			});

		svg.selectAll(".arc")
			.attr("d", pie.arc)
			.style("fill", function(d){ return pie.color(d.data.AGE) });

		// Update arc size for events
		/*
		svg.selectAll(".event_arc")
			.attr("d", function(d, i){
				innerEvRadius = pie.radius/2 + i * pie.radius/24,
				outerEvRadius = innerEvRadius + pie.radius/24;

				return d3.svg.arc()
						.outerRadius(innerEvRadius)
						.innerRadius(outerEvRadius);
			});*/
		// Look for any Event Arcs and update start angles
		pie.svg.selectAll(".event_arc").remove();
		for(k = 0; k < pie.events.length; k++)
			if (pie.events[k] != null) {
				self.drawEventArc(pie.events[k], k);
			}
	},

	/* Adds a tooltip for each pie slice 
	*/
	createTooltip: function(){
		var self = this;
		var pie = this.pie;

		pie.tooltip = d3.select(pie.tag)
				.append("div")
				.attr("class", "pie_tooltip");
		pie.tooltip.append("div")
				.attr("class", "piett_label");
		pie.tooltip.append("div")
				.attr("class", "piett_count");
		pie.tooltip.append("div")
				.attr("class", "piett_percent");
	},

	/* Adds a tooltip for the event displayed in the chart
	*/
	createEventTooltip: function(){
		var pie = this.pie;

		pie.eventTooltip = d3.select(pie.tag)
				.append("div")
				.attr("class", "event_tooltip");
		pie.eventTooltip.append("div")
				.attr("class", "event_name");
		var yearLocation = pie.eventTooltip.append("div");
		yearLocation.append("span")
				.attr("class", "event_country");
		yearLocation.append("span")
				.attr("class", "event_year");
		pie.eventTooltip.append("div")
				.attr("class", "event_percent");
	},

	/* Checks if a given age is in an interval. The data was stored as string
	   with a start age and final age in the format: "9 - 19" 
	*/
	isAgeInInterval: function(targetAge, arcAge){
		var pie = this.pie;
		if (pie.agesRange == 1){
			if (parseInt(arcAge) == targetAge) return true;
			else return false;
		} else {
			var ages = arcAge.split("-");
			if (targetAge >= parseInt(ages[0]) &&
				targetAge <= parseInt(ages[1]))
				return true;
			else 
				return false;
		}
	},

	/* Gets the angle where the event arc starts meaning the maximum age theat
	   may remember an event  
	*/
	getStartAngle: function(d, targetAge, arcAge){
		var pie = this.pie;
		if (pie.agesRange == 1)
			return d.startAngle;
		else {
			var angleChunk = (d.endAngle - d.startAngle)/pie.agesRange;
			var ages = arcAge.split("-");
			return d.startAngle + (pie.agesRange - (parseInt(ages[1]) - targetAge) - 1) * angleChunk;
		}
	},

	/* Adds a new event to the chart  
	*/
	addEvent: function(event){
		var self = this,
		    pie = this.pie;
		    pos = 0;

		for (i = 0; i < pie.events.length; i++){
			e = pie.events[i];

			if (e != null && e.id == event.id){
				pie.events.splice(i,1);
				pie.events.push(null);
				self.resize();
				break;
			}else if (e == null){
				pie.events[i]=event;
				self.drawEventArc(event, i);
				break;
			}
		}
	},

	/* Removes event 
	*/
	removeEvent: function(id){
		var pie = this.pie;

		for (i = 0; i < pie.events.length; i++){
			e = pie.events[i];
			if (e != null && e.id == id){
				pie.events.pop(i);
				break;
			}
		}
	},

	/* Draws each event circumference using 2 arcs. 
	*/
	drawEventArc: function(event, pos) {
		var pie = this.pie,
				self = this;

		// Age 12 is assumed for a person to have been
		// conscious of the event
		var targetAge = pie.year - event.year + 12;
		var paths = pie.svg.selectAll(".arc");
		for(i = 0; i < paths[0].length; i++){
			age = paths[0][i]._current.data.AGE;
			if (self.isAgeInInterval(targetAge, age)){
				var startAngle = self.getStartAngle(paths[0][i]._current, targetAge, age);
				event.startAge = targetAge;
				draw(event, startAngle, pos);
				break;
			}
		}

		function draw(event, startAngle, pos){
			var innerRadius = pie.radius/2 + pos * pie.radius/24,
			    outerRadius = innerRadius + pie.radius/24;

			var noEventArc = d3.svg.arc()
						.innerRadius(innerRadius)
						.outerRadius(outerRadius)
						.startAngle(0)
						.endAngle(startAngle);
			var eventArc = d3.svg.arc()
						.innerRadius(innerRadius)
						.outerRadius(outerRadius)
						.startAngle(startAngle)
						.endAngle(2 * Math.PI);
			var pathNoEvent = pie.svg.append("path")
						.attr("class", "event_arc")
						.attr("d", noEventArc)
						.attr("fill", "grey");
			var pathEvent = pie.svg.append("path")
						.attr("class", "event_arc")
						.attr("d", eventArc);

			pathEvent.on("mouseover", function(d){
				eventMouseOver(event, true);
			});
			pathEvent.on("mouseout", function(d){
				eventMouseOut();
			});
			pathNoEvent.on("mouseover", function(d){
				eventMouseOver(event, false);
			});
			pathNoEvent.on("mouseout", function(d){
				eventMouseOut();
			});
		};

		// remembered is used to use a different color for the
		// percentage based on the user consciousness of that event.
		function eventMouseOver(event, remembered){
			var totalPeople = self.populationYear(pie.total, pie.year),
				totalEvent = self.getTotalPeople(event.startAge, 99),
				percent = 0.0;

			var tooltip_per = pie.eventTooltip.select(".event_percent");
			if (remembered){
				percent = Math.round(1000 * totalEvent / totalPeople)/10;
				tooltip_per.classed("no-remember", false);
				tooltip_per.classed("remember", true);
			} else{
				percent = Math.round(1000 * (1 - (totalEvent / totalPeople)))/10;
				tooltip_per.classed("no-remember", true);
				tooltip_per.classed("remember", false);
			}
			tooltip_per.html(percent + "%");

			pie.eventTooltip.select(".event_name").html(event.name);
			pie.eventTooltip.select(".event_year").html("("+ event.year + ")");
			pie.eventTooltip.select(".event_country").html(event.place + " ");
			
			pie.eventTooltip.style("display", "block");
			pie.eventTooltip.style("top", (d3.event.pageY + 10) + "px");
			pie.eventTooltip.style("left", (d3.event.pageX + 10) + "px");

		};

		function eventMouseOut(){
			pie.eventTooltip.style("display", "none");
		}
	},

	/* Initializes the pie chart.
	*/
	init: function() {
		var self = this;
		var pie = this.pie;

		var x = d3.select(pie.tag).style("width"),
		    y = d3.select(pie.tag).style("height");

		if (parseInt(y) < 500){
			pie.ytransStatePop = 10;
		    pie.ytransYear = 20;
		} else {
			pie.ytransStatePop = 20;
			pie.ytransYear = 50;
		}

		pie.width = parseInt(x) - pie.margin.left - pie.margin.right,
		pie.height = parseInt(y) - pie.margin.top - pie.margin.bottom;
		pie.radius = Math.min(pie.width, pie.height)/2;

		// Attach pie slice details tooltip
		self.createTooltip();
		self.createEventTooltip();

		// Colors from colorbrewer2.org (sequential, 9, blue scale)
		//pie.color = d3.scale.ordinal()
		//	.range(["#d9d9d9","#deebf7","#c6dbef","#9ecae1","#6baed6",
		//		"#4292c6","#2171b5","#08519c","#08306b"]);
		pie.color = d3.scale.category20();

		pie.arc = d3.svg.arc()
			.outerRadius(pie.radius)
			.innerRadius(pie.radius / 2.2);

		pie.chart = d3.layout.pie()
			.sort(null)
			.value(function(d){ return self.populationYear(d, pie.year); });

		pie.svg = d3.select(pie.tag).append("svg")
				.attr({
					width: pie.width + pie.margin.left + pie.margin.right,
					height: pie.height + pie.margin.top + pie.margin.bottom
				})
			.append("g")
				.attr("transform", "translate(" + pie.width/2 + "," + (pie.height/2 + 30) + ")");

		// Create elements for storing the state data in the center
		// of the pie chart
		pie.svg.append("g")
			.attr("class", "state_data");
		pie.svg.select(".state_data")
        		.append("text")
        		  .attr("class","state_name")
        		  .style("color", "black")
        		  .attr("text-anchor", "middle")
        		  .attr("transform", "translate(0,-10)");
       	pie.svg.select(".state_data")
        		.append("text")
        		  .attr("class","state_pop")
        		  .attr("text-anchor", "middle")
        		  .attr("transform", "translate(0," + pie.ytransStatePop + ")");
        pie.svg.select(".state_data")
        		.append("text")
        		  .attr("class","state_year")
        		  .attr("text-anchor", "middle")
        		  .attr("transform", "translate(0," + pie.ytransYear + ")");

        self.create();
	}
}