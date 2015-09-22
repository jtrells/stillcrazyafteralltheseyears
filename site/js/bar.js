/*
	BarChart: Object for plotting the age distribution for specific year and population
*/
function BarChart(data1y, data10y, year, zone, agesRange, target, typeZone) {
	this.bchart = {};
	this.bchart.margin = {top: 20, right: 10, bottom: 40, left: 90};
	this.bchart.height = 0;
	this.bchart.width = 0;
	this.bchart.chartHeight = 0;
	this.bchart.eventHeight = 30;
	this.bchart.eventPadTop = 40;

	this.bchart.year = year;
	this.bchart.zone = zone;
	this.bchart.total = 0;
	this.bchart.agesRange = agesRange; // Range of ages used to show the data
	this.bchart.typeZone = typeZone;	// state or country

	// Events associated with population [0-9]
	this.bchart.events = [null, null, null, null, null,null, null, null, null, null];

	this.bchart.svg = null;
	this.bchart.tooltip = null;
	this.bchart.eventTooltip = null;

	this.bchart.data1y = data1y;
	this.bchart.data10y = data10y;
	this.bchart.data = null;
	this.bchart.total = null;

	this.bchart.tag = target;

	this.bchart.xScale = null;
	this.bchart.yScale = null;
	this.bchart.xAxis = null;
	this.bchart.yAxis = null;
}

BarChart.prototype = {
	constructor: BarChart,

	filterData: function(){
		var self = this
			bar = this.bchart;

		if (bar.agesRange == 1){
			bar.data = 
				bar.data1y.filter(function(el){ return el.AGE != "999" && el.NAME == bar.zone && el.SEX == "0" });
			bar.total = 
				bar.data1y.filter(function(el){ return el.AGE == "999" && el.NAME == bar.zone && el.SEX == "0" })[0];
		} else{
			bar.data = 
				bar.data10y.filter(function(el){ return el.AGE != "999" && el.NAME == bar.zone && el.SEX == "0" });
			bar.total = 
				bar.data10y.filter(function(el){ return el.AGE == "999" && el.NAME == bar.zone && el.SEX == "0" })[0];			
		}
	},

	getTotalPeople: function(startAge, endAge){
		var self = this,
			bar = this.bchart;

		var filterData = bar.data1y.filter(function(el){ 
							return parseInt(el.AGE) >= startAge && parseInt(el.AGE) <= endAge 
									&& el.NAME == bar.zone && el.SEX == "0"; 
						 });

		var total = 0;
		for(i = 0; i < filterData.length; i++){
			total += parseInt(self.populationYear(filterData[i], bar.year));
		}
		return total;
	},

	createAgeTooltip: function(){
		var bar = this.bchart;

		bar.tooltip = d3.select(bar.tag)
				.append("div")
				.attr("class", "bar_age_tooltip");
		bar.tooltip.append("div")
				.attr("class", "bar_age_label");
		bar.tooltip.append("div")
				.attr("class", "bar_age_count");
		bar.tooltip.append("div")
				.attr("class", "bar_age_percent");
	},

	createEventTooltip: function(){
		var bar = this.bchart;

		bar.eventTooltip = d3.select(bar.tag)
				.append("div")
				.attr("class", "event_tooltip");
		bar.eventTooltip.append("div")
				.attr("class", "event_name");
		var yearLocation = bar.eventTooltip.append("div");
		yearLocation.append("span")
				.attr("class", "event_country");
		yearLocation.append("span")
				.attr("class", "event_year");
		bar.eventTooltip.append("div")
				.attr("class", "event_percent");
	},

	isAgeInInterval: function(targetAge, barAge){
		var bar = this.bchart;

		if (bar.agesRange == 1){
			if (parseInt(barAge) == targetAge) return true;
			else return false;
		} else {
			var ages = barAge.split("-");
			if (targetAge >= parseInt(ages[0]) &&
				targetAge <= parseInt(ages[1]))
				return true;
			else 
				return false;
		}
	},

	/* Add an event to the bar chart. The drawing is mainly done on the resize function
	   as each bar is removed and redrawn. 
	*/
	addEvent: function(event){
		var self = this,
		    bar = this.bchart,
		    k = 0;

		for (k = 0; k < bar.events.length; k++){
			e = bar.events[k];

			// If an event is sent for the second time, remove
			// it from the list.
			if (e != null && e.id == event.id){
				bar.events.splice(k,1);
				bar.events.push(null);
				self.resize();
				break;
			} else if (e == null){
				// Only add an event if it does not exist in the
				// list and there is space.
				bar.events[k] = event;
				self.resize();
				break;
			}
		}
	},

	/* Draws the bars at the bottom of the bar chart 
	*/
	drawEvent: function(event, pos) {
		var self = this,
			bar = this.bchart;

		var targetAge = bar.year - (event.year - 12);
		var eventRects = bar.svg.selectAll(".bar_rect");
		for (m = 0; m < eventRects[0].length; m ++){
			barAge = eventRects[0][m]._current.AGE;
			event.startAge = targetAge;

			if (self.isAgeInInterval(targetAge, barAge)){
				xStart = eventRects[0][m].x.animVal.value;
				xEnd = xStart + eventRects[0][m].width.animVal.value;
				delta = (xEnd - xStart)/bar.agesRange;

				var x = 0;
				if (bar.agesRange == 1)
					x = xStart;
				else{
					var ages = barAge.split("-");
					x = xStart + delta * (bar.agesRange - (parseInt(ages[1]) - targetAge));
				}

				var totalPeople = self.populationYear(bar.total, bar.year);
				var totalEvent = self.getTotalPeople(event.startAge, 99);
				var percent = Math.round(1000 * totalEvent / totalPeople)/10;
				
				var eventBar = bar.svg.append("rect")
					.attr("class", "rect_event")
					.attr("width", bar.width - x)
					.attr("height", bar.eventHeight)
					.attr("x", x)
					.attr("y", bar.chartHeight + bar.eventPadTop + pos * bar.eventHeight)
					.attr("fill", "#black");	
				eventBar.on("mouseover", function(){ eventMouseOver(event, percent); });
				eventBar.on("mouseout", function(){ eventMouseOut(); });

				var eventTextPercentage = bar.svg.append("text")
						.attr("class","bar_event_percent")
						.attr("id", "bar_event_percent" + event.id)
						.attr("x", x)
						.attr("y", bar.chartHeight + bar.eventPadTop + (pos + 1) * bar.eventHeight - 3)
						.attr("text-anchor", "end")
						.text(percent + "% ");
				var eventText = bar.svg.append("text")
						.attr("class","bar_event_text")
						.attr("id", "bar_event_text" + event.id)
						.attr("x", bar.width)
						.attr("y", bar.chartHeight + bar.eventPadTop + (pos + 1) * bar.eventHeight - 3)
						.attr("text-anchor", "end")
						.text(event.name);
			}
		};

		function eventMouseOver(event, percent){
			bar.eventTooltip.select(".event_name").html(event.name);
			bar.eventTooltip.select(".event_year").html("("+ event.year + ")");
			bar.eventTooltip.select(".event_country").html(event.place + " ");
			bar.eventTooltip.select(".event_percent").html(percent + "%");
			bar.eventTooltip.style("display", "block");
			bar.eventTooltip.style("top", (d3.event.pageY - 100) + "px");
			bar.eventTooltip.style("left", (d3.event.pageX + 10) + "px");			
		}

		function eventMouseOut(){
			bar.eventTooltip.style("display", "none");
		}
	},

	getNumberActiveEvents: function() {
		var bar = this.bchart, 
			n = 0;
		for(i = 0; i < bar.events.length; i++)
			if (bar.events[i] != null) n++;
		return n;
	},

	/* Creates a new bar chart. Also used when updating the age range 
	*/
	create: function(){
		var self = this,
			bchart = this.bchart,
			formatter = d3.format(",.0f");		// Format for elements in the Y axis
		var zone = bchart.zone;

		// Remove any existing bar or axis.
		bchart.svg.selectAll(".bar").remove();
		bchart.svg.selectAll(".x").remove();
		bchart.svg.selectAll(".y").remove();
		self.filterData();

		// Configure scales and axis
		var maxY = d3.max(bchart.data, function(d) { return parseInt(self.populationYear(d,bchart.year));});
		var total = d3.sum(bchart.data, function(d) { return parseInt(self.populationYear(d,bchart.year));});

		bchart.xScale.domain(bchart.data.map(function(d) { if (d.AGE != "999") return d.AGE; }));
		bchart.yScale.domain([maxY,0]);

		bchart.xAxis = d3.svg.axis()
						.scale(bchart.xScale)
						.orient("bottom");
		if (bchart.agesRange == 1)
			bchart.xAxis.tickValues([0, 10, 20, 30, 40, 50, 60, 70, 80]);

		bchart.yAxis = d3.svg.axis()
						.scale(bchart.yScale)
						.orient("left")
						.ticks(10)
						.tickFormat(function(d){ return formatter(d/1000) });

		// Create rectangles (bars)
		var barContainer = bchart.svg
				.append("g")
			  	.attr("class", "bar");

		var bars = barContainer.selectAll("rect")
					  .data(bchart.data, this.keys);
		bars.enter().append("rect")
			  .attr("x", function(d) { return bchart.xScale(d.AGE); })
			  .attr("y", function(d) { return bchart.yScale(self.populationYear(d,bchart.year));}) 
			  .attr("width", bchart.xScale.rangeBand())
			  .attr("class", "bar_rect")
			  .attr("height", function(d) { 
			  	return bchart.chartHeight - bchart.yScale(self.populationYear(d,bchart.year));
			  })
			  .each(function(d){ this._current = d; });
		bars.exit().transition()
					.duration(500)
					.remove();
		bars.on("mouseover", function(d){
			var x = 1;
			var ageLabel = d.AGE;
			if (ageLabel == "85")
				ageLabel = "85+";

			var population = self.populationYear(d, bchart.year);
			var total = self.populationYear(bchart.total, bchart.year);
			var percent = Math.round(1000 * population / total)/10;

			var xPosition = parseFloat(d3.select(this).attr("x")) + bchart.xScale.rangeBand() / 2;
			var yPosition = parseFloat(d3.select(this).attr("y")) / 2 + bchart.chartHeight / 2;

			bchart.tooltip.select(".bar_age_label").html("Ages: " + ageLabel);
			bchart.tooltip.select(".bar_age_count").html(formatter(population) + " ppl");
			bchart.tooltip.select(".bar_age_percent").html(percent + "%");
			bchart.tooltip.style("display", "block");
			bchart.tooltip.style("top", (d3.event.pageY - 20) + "px");
			bchart.tooltip.style("left", (d3.event.pageX + 10) + "px");
			//bchart.tooltip.style("top", yPosition + "px");
			//bchart.tooltip.style("left", xPosition + "px");
		});
		bars.on("mouseout", function(d){
			bchart.tooltip.style("display","none");
		});

		// Append xAxis and yAxis to the chart
		bchart.svg.append("g")
				.call(bchart.xAxis)
					.attr("class", "x axis")
					.attr("transform", "translate(0," + bchart.chartHeight + ")");
					/*
				.append("text")
					.attr("y", 30)
					.text("Population Ages Ranges");*/
		bchart.svg.append("g")
				.call(bchart.yAxis)
					.attr("class", "y axis")
					.attr("transform", "translate(-10,0)")
				.append("text")
					//.attr("transform", "rotate(-90)")
					.attr("y", 0)
					.attr("x", 0)
					.style("text-anchor", "beginning")
					.attr("class","ylabel")
					.text("Population (in thousands)");

		bchart.svg.selectAll(".bar_event_percent").remove();
		bchart.svg.selectAll(".bar_event_text").remove();
		bchart.svg.selectAll(".rect_event").remove();
		for(k = 0; k < bar.events.length; k++)
			if (bar.events[k] != null)
				self.drawEvent(bar.events[k], k);
	},

	/* Gets the x-axis key for the non numerical scale  
	*/
	keys: function(d){
		return d.AGE;
	},

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

	/* Resizes the bar chart
	*/
	resize: function(){
		var self = this,
			bar = this.bchart;
		var x = d3.select(self.bchart.tag).style("width"),
		    y = d3.select(self.bchart.tag).style("height"),
		    noEvents = self.getNumberActiveEvents();

		self.bchart.width = parseInt(x) - self.bchart.margin.left - self.bchart.margin.right,
		self.bchart.height = parseInt(y) - self.bchart.margin.top - self.bchart.margin.bottom;
		bar.chartHeight = bar.height - noEvents * this.bchart.eventHeight;

		// Resize chart
		self.bchart.xScale.rangeBands([0, self.bchart.width], 0.2, 0);
		self.bchart.yScale.range([0, self.bchart.chartHeight]);

		bar.svg.attr({
			width: self.bchart.width + self.bchart.margin.left + self.bchart.margin.right,
			height: self.bchart.height + self.bchart.margin.top + self.bchart.margin.bottom
		});

		bar.svg.select(".x.axis")
				.call(self.bchart.xAxis.orient("bottom"))
				.attr("transform", "translate(0," + self.bchart.chartHeight + ")");
		bar.svg.select(".y.axis").call(self.bchart.yAxis.orient("left"));
		bar.svg.selectAll(".bar_rect").attr({
			x: function(d) { return self.bchart.xScale(d.AGE); },
			y: function(d) { return self.bchart.yScale(self.populationYear(d,self.bchart.year)) },
			width: self.bchart.xScale.rangeBand(),
			height: function(d) { return self.bchart.chartHeight - self.bchart.yScale(self.populationYear(d,self.bchart.year));}
		});

		bar.svg.selectAll(".rect_event").remove();
		bar.svg.selectAll(".bar_event_percent").remove();
		bar.svg.selectAll(".bar_event_text").remove();
		for(k = 0; k < bar.events.length; k++)
			if (bar.events[k] != null)
				self.drawEvent(bar.events[k], k);
	},

	/* Updates the chart information based on a change in its parameters  
	*/
	update: function(year, zone, agesRange) {
		var self = this,
			bar = this.bchart,
			oldRange = bar.agesRange;

		bar.year = year;
		bar.zone = zone;
		bar.agesRange = agesRange;

		if (bar.agesRange != oldRange){
			self.create();
		} else {
			self.filterData();

			var maxY = d3.max(bar.data, function(d) { return parseInt(self.populationYear(d,bar.year));});
			self.bchart.yScale.domain([maxY, 0]);
			bar.svg.select(".y.axis")
					.transition()
					.duration(500)
					.call(self.bchart.yAxis.orient("left"));

			bar.svg.selectAll(".bar_rect")
				.data(bar.data, self.keys)
				.transition()
				.duration(500)
				.attr({
					x: function(d) { return bar.xScale(d.AGE); },
					y: function(d) { return bar.yScale(self.populationYear(d,bar.year)) },
					width: bar.xScale.rangeBand(),
					height: function(d) { return bar.chartHeight - bar.yScale(self.populationYear(d,bar.year));}
				});
		};

		bar.svg.selectAll(".bar_event_percent").remove();
		bar.svg.selectAll(".bar_event_text").remove();
		bar.svg.selectAll(".rect_event").remove();
		for(k = 0; k < bar.events.length; k++)
			if (bar.events[k] != null)
				self.drawEvent(bar.events[k], k); 
	},

	init: function() {
		var self = this,
			bar = this.bchart;

		var x = d3.select(bar.tag).style("width"),
		    y = d3.select(bar.tag).style("height"),
		    noEvents = self.getNumberActiveEvents();

		if (parseInt(x) < 500)
			bar.eventHeight = 10;

		bar.width = parseInt(x) - bar.margin.left - bar.margin.right,
		bar.height = parseInt(y) - bar.margin.top - bar.margin.bottom;
		bar.chartHeight = bar.height - noEvents * bar.eventHeight;

		self.createAgeTooltip();
		self.createEventTooltip();

		bar.xScale = d3.scale.ordinal()
						.rangeBands([0, bar.width], 0.2, 0);
		bar.yScale = d3.scale.linear()
						.range([0, bar.chartHeight]);

		this.bchart.svg = d3.select(bar.tag).append("svg")
					.attr({
						width: bar.width + bar.margin.left + bar.margin.right,
						height: bar.height + bar.margin.top + bar.margin.bottom
						//viewBox: "0 0 " + this.bchart.width + " " + this.bchart.height,
						//preserveAspectRatio: "xMinYMin meet"
					})
		  		.append("g")
		  			.attr("transform", "translate(" + bar.margin.left + "," + bar.margin.top + ")");

		self.create();
	}
}
