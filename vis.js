/** Class for a force bubble visualisation of a dataset (featuring countries). Countries are drawn as circles with area proportional to the value in a given year and identified by their flags (contained within the /img folder).
 * To use this class, your page must contain a div element (of any id, though the class defaults to "vis") and the div element must contain an svg element (the size of which affects the final visualisation).
 * You must also have included d3.js (v4) using a script tag earlier in the html page since this class depends on "d3" being defined.
*/

class Visualisation {
    /**
     * Create the visualisation - this sets up some of the basic svg and d3 stuff - before you can enjoy the visualisation, you must call [setYearRange()]{@link Visualisation#setYearRange} and ideally [setLegendTags()]{@link Visualisation#setLegendTags}. After that you can call [startVisFromCSV()]{@link Visualisation#startVisFromCSV} if you have a csv, or [startVis()]{@link Visualisation#startVis} if you already have an object.
     * @param {String} id - This is the id of a div element in the body of the html using this class. The div must also contain an svg, the size of which determines the size of the visualisation. By default, the constructor uses 'vis', but if this id is already in use on the page, you can use the parameter to specify another.
     * @param {Number} strength - This is the strength of the attractive force between nodes in the visualisation. 0.2 seems to work best when visualising all world countries.
     */
    constructor (id = 'vis', strength = 0.2) {
        this.id = id;
        this.svg = d3.select('#' + id).select('svg'); // Select svg
        this.width = document.body.clientWidth; // Get the width from the width of the browser
        this.height = +this.svg.attr('height'); // Height comes from the height of the svg as defined by the html
        this.centerX = this.width * 0.5;
        this.centerY = this.height * 0.5; // Calculates the centre x and y co-ords
        this.strength = strength; // Determines the attraction between nodes

        this.format = d3.format(',d');

        this.scaleColor = d3.scaleOrdinal(d3.schemeCategory20); // Defines legend colours

        this.excludes = ['ARB', 'CEB', 'CSS', 'EAP', 'EAR', 'EAS', 'ECA', 'ECS', 'EMU', 'EUU', 'FCS', 'HIC', 'HPC', 'IBD', 'IBT', 'IDA', 'IDB', 'IDX', 'INX', 'LAC', 'LCN', 'LDC', 'LIC', 'LMC', 'LMY', 'LTE', 'MEA', 'MIC', 'MNA', 'NAC', 'OED', 'OSS', 'PRE', 'PSS', 'PST', 'SSA', 'SSF', 'SST', 'TEA', 'TEC', 'TLA', 'TMN', 'TSA', 'TSS', 'UMC', 'WLD', 'SAS'];
        // This list contains all of the iso-3 country codes appearing in world bank datasets that aren't actually countries (but are instead groups of countries). Including these would lead to issues so I have to exclude them.
    }

    /**
     * This method takes a path to a csv and uses d3 to access the csv. From there, it hands off to [startVis()]{@link Visualisation#startVis} to begin the visualisation.
     * @param {String} path - The file (or url) path to the csv datasets. Bear in mind that browsers will block CORS requests so specifying a local file may fail. The csv itself should be a table with countries as rows. Each row should have a value for "Country Code", "Country Name" and one for each of the years set by [setYearRange()]{@link Visualisation.setYearRange}. "Country Code" must correspond to an ISO 3166-1 alpha-3 code, and the value for each year should be a number.
     */
    startVisFromCSV (path) {
        const self = this; // This is a weird hack to let us call the d3 function from inside the class
        d3.csv(path, (d) => { // Declares function to call in the same scope on csv
            return this.processRow(d); // Call this class' processRow() function
        }, function (data) { // Loads the csv based on the location given, processes each row, then starts the visualisation
            self.startVis(data);
        });
    }

    /**
     * Setter method for the year range of the visualisation. This MUST be called before [startVis()]{@link Visualisation#startVis} or [startVisFromCSV()]{@link Visualisation#startVisFromCSV}.
     * If you provide an invalid date range (i.e. years beyond the dataset), the visualisation will fail to start correctly.
     * @param {Number} start - The first year in the dataset (inclusive).
     * @param {Number} end - The final year in the dataset (inclusive).
     */
    setYearRange (start, end) {
        this.syear = start;
        this.eyear = end;
    }

    /**
     * Getter function for the year range of the data set.
     * @returns {Array} Returns an array, the first element of which is the start year, the second element of which is the last year. If this is called before [setYearRange()]{@link Visualisation#setYearRange} then it will return the array [undefined,undefined].
     */
    getYearRange () {
        return [this.syear, this.eyear];
    }

    /**
     * Function to set the tags that are used in the legend of the visualisation to show what the size of a circle indicates. This function will only have an observable effect if called before [startVis()]{@link Visualisation#startVis}. If startVis() is called first, then it will use the default values.
     * @param {String} low - The text to be displayed in the legend indicating a lower quantity (e.g. if your data is on the number of sheep, this may read "fewer sheep").
     * @param {String} high - The text to be displayed in the legend indicating a higher quantity (e.g. if your data is on the number of sheep, this may read "more sheep").
     */
    setLegendTags (low = 'less', high = 'more') {
        this.lowtag = low;
        this.hightag = high;
    }

    /**
     * Getter function for the data property (if you want to extract it out of the visualisation for whatever reason). Don't call before calling [startVisFromCSV()]{@link Visualisation#startVisFromCSV} or [startVis()]{@link Visualisation#startVis} otherwise you will get undefined back.
     * @returns {Array} - The data stored for the visualisation. It is an array containing objects with properties 'name', 'code' and an array 'dseries' containing the data points for each year in the dataset.
     */
    getData () {
        return this.data;
    }

    /**
     * Function to set up and begin the visualisation - this can be called directly or through [startVisFromCSV()]{@link Visualisation#startVisFromCSV}. Assuming [setYearRange()]{@link Visualisation#setYearRange} has been called and the data is valid, it will create a force simulation with each data item as a node. The method also creates a slider enabling the user to move between years (it will start at the earliest year in the dataset).
     * @param {Object} dat - The data to be displayed in the visualisation (normally this comes from d3.csv). If you're manually calling this, each item in dat should have a certain set of properties:
     * @param {String} dat.name - The name of the country.
     * @param {String} dat.code - The ISO 3166-1 alpha-3 country code of the country - if these aren't correct the flags will fail to display.
     * @param {Array} dat.dseries - The data series for that particular country. Each item in the array should be a Number representing the value at that year.
     */
    startVis (dat) { // Function to initialise the visualisation
        if (this.syear === undefined || this.eyear === undefined) { // If the years haven't been set yet
            console.log('Data range not defined, try calling setYearRange() first.'); // We can't "guess" what the range would be given the data, so we just have to abort trying to make the visualisation.
            return; // Exit function
        }

        if (this.lowtag === undefined || this.hightag === undefined) { // If the legend tags haven't yet been set,
            this.setLegendTags(); // Set them to the default values
        }

        dat = dat.filter(el => { // Filter the dataset
            return !(this.excludes.includes(el.code)); // Remove anything that has the code of a country group
        });
        this.data = dat; // So we can use the data in other functions
        this.pack = d3.pack().size([this.width, this.height]).padding(1.5);
        this.forceCollide = d3.forceCollide(d => d.r + 1); // Define the collision force so it takes effect within a 1 pixel radius of each node
        this.simulation = d3.forceSimulation().force('charge', d3.forceManyBody()).force('collide', this.forceCollide).force('x', d3.forceX(this.centerX).strength(this.strength)).force('y', d3.forceY(this.centerY).strength(this.strength));
        // Sets up all of the forces for the d3 force simulation
        // reduce number of circles on mobile screen due to slow computation
        if ('matchMedia' in window && window.matchMedia('(max-device-width: 767px)').matches) { // If the device is mobile
            dat = dat.filter(el => {
            return el.dseries[0] >= 500000; // Filter out small population countries to reduce the number of circles we need to draw - should help performance and battery life
            });
        }

        this.root = d3.hierarchy({ children: dat }).sum(function (d) {
            if (d.dseries === undefined) {
                return 0;
            } else {
                return d.dseries.slice(-1);
            }
        });

        this.nodes = this.pack(this.root).leaves().map(node => { // Generate our nodes
            const data = node.data;
            return {
                x: this.centerX + (node.x - this.centerX) * 3, // magnify start position to have transition to center movement
                y: this.centerY + (node.y - this.centerY) * 3,
                r: 0, // for tweening
                radius: Math.sqrt(data.dseries[0]) * 0.0050, // Define original radius as proportional to the sqrt of population (so area is proportional to population)
                id: data.code,
                name: data.name,
                value: data.dseries // Sets other properties based on data
            };
        });

        const self = this; // This is a hack to get the object into some d3 calls

        this.svg.style('background-color', '#eee'); // Sets a grey background
        this.node = this.svg.selectAll('.node') // Select all nodes created in the svg
            .data(this.nodes) // Select data
            .enter().append('g') // Create all that must be created (this will be all)
            .attr('class', 'node')
            .call(d3.drag() // When user drags node
                .on('start', (d) => {
                if (!d3.event.active) self.simulation.alphaTarget(0.2).restart(); // Restart the simulation
                d.fx = d.x;
                d.fy = d.y; // Fix the position of the node
                console.log(d.x, d.y);
            })
            .on('drag', (d) => { // Whilst it is being dragged
                d.fx = d3.event.x;
                d.fy = d3.event.y; // Fix its co-ords to the mouse
            })
            .on('end', (d) => { // When the user releases it
                if (!d3.event.active) self.simulation.alphaTarget(0); // Bring the simulation back to calm
                d.fx = null;
                d.fy = null; // Unfix its co-ordinates
            }));

        this.node.append('circle') // Append circles to every node
            .attr('id', d => d.id) // Transfer node data
            .attr('r', 0) // Start with 0 radius
            .style('fill', d => this.scaleColor()) // Fill as appropriate
            .transition().duration(2000).ease(d3.easeElasticOut) // Transition the radius in - gives a "bounce" effect
                .tween('circleIn', function (d) { // Tween function
                const i = d3.interpolateNumber(0, d.radius); // Interpolate between 0 and the target
                return (t) => { // On each tick
                    d.r = i(t); // Set the radius
                    self.simulation.force('collide', self.forceCollide); // Update the simulation
                };
                });

        this.node.append('image') // Append a flag image to every node
            .classed('node-icon', true)
            .attr('clip-path', d => `url(#clip-${d.id})`) // Set class and clip path
            .attr('xlink:href', d => { // Set href
                // This is a dict that maps iso-3 country codes to iso-2 (world bank datasets use iso-3 but good flag downloads I found used iso-2 - any iso-3 downloads were low-res bitmaps instead of beautiful svgs)
                const mapping = { AFG: 'AF', ALA: 'AX', ALB: 'AL', DZA: 'DZ', ASM: 'AS', AND: 'AD', AGO: 'AO', AIA: 'AI', ATA: 'AQ', ATG: 'AG', ARG: 'AR', ARM: 'AM', ABW: 'AW', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH', BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ', BMU: 'BM', BTN: 'BT', BOL: 'BO', BIH: 'BA', BWA: 'BW', BVT: 'BV', BRA: 'BR', VGB: 'VG', IOT: 'IO', BRN: 'BN', BGR: 'BG', BFA: 'BF', BDI: 'BI', KHM: 'KH', CMR: 'CM', CAN: 'CA', CPV: 'CV', CYM: 'KY', CAF: 'CF', TCD: 'TD', CHL: 'CL', CHN: 'CN', HKG: 'HK', MAC: 'MO', CXR: 'CX', CCK: 'CC', COL: 'CO', COM: 'KM', COG: 'CG', COD: 'CD', COK: 'CK', CRI: 'CR', CIV: 'CI', HRV: 'HR', CUB: 'CU', CYP: 'CY', CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DMA: 'DM', DOM: 'DO', ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', ETH: 'ET', FLK: 'FK', FRO: 'FO', FJI: 'FJ', FIN: 'FI', FRA: 'FR', GUF: 'GF', PYF: 'PF', ATF: 'TF', GAB: 'GA', GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH', GIB: 'GI', GRC: 'GR', GRL: 'GL', GRD: 'GD', GLP: 'GP', GUM: 'GU', GTM: 'GT', GGY: 'GG', GIN: 'GN', GNB: 'GW', GUY: 'GY', HTI: 'HT', HMD: 'HM', VAT: 'VA', HND: 'HN', HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE', IMN: 'IM', ISR: 'IL', ITA: 'IT', JAM: 'JM', JPN: 'JP', JEY: 'JE', JOR: 'JO', KAZ: 'KZ', KEN: 'KE', KIR: 'KI', PRK: 'KP', KOR: 'KR', KWT: 'KW', KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB', LSO: 'LS', LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT', LUX: 'LU', MKD: 'MK', MDG: 'MG', MWI: 'MW', MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT', MHL: 'MH', MTQ: 'MQ', MRT: 'MR', MUS: 'MU', MYT: 'YT', MEX: 'MX', FSM: 'FM', MDA: 'MD', MCO: 'MC', MNG: 'MN', MNE: 'ME', MSR: 'MS', MAR: 'MA', MOZ: 'MZ', MMR: 'MM', NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL', ANT: 'AN', NCL: 'NC', NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG', NIU: 'NU', NFK: 'NF', MNP: 'MP', NOR: 'NO', OMN: 'OM', PAK: 'PK', PLW: 'PW', PSE: 'PS', PAN: 'PA', PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH', PCN: 'PN', POL: 'PL', PRT: 'PT', PRI: 'PR', QAT: 'QA', REU: 'RE', ROU: 'RO', RUS: 'RU', RWA: 'RW', BLM: 'BL', SHN: 'SH', KNA: 'KN', LCA: 'LC', MAF: 'MF', SPM: 'PM', VCT: 'VC', WSM: 'WS', SMR: 'SM', STP: 'ST', SAU: 'SA', SEN: 'SN', SRB: 'RS', SYC: 'SC', SLE: 'SL', SGP: 'SG', SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO', ZAF: 'ZA', SGS: 'GS', SSD: 'SS', ESP: 'ES', LKA: 'LK', SDN: 'SD', SUR: 'SR', SJM: 'SJ', SWZ: 'SZ', SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW', TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG', TKL: 'TK', TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM', TCA: 'TC', TUV: 'TV', UGA: 'UG', UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US', UMI: 'UM', URY: 'UY', UZB: 'UZ', VUT: 'VU', VEN: 'VE', VNM: 'VN', VIR: 'VI', WLF: 'WF', ESH: 'EH', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW', XKX: 'XK' };
                const code = mapping[d.id]; // Get the two letter code
                if (code) { // If thee code is defined (i.e. country code is valid)
                    return 'img/' + code.toLowerCase() + '.svg'; // Construct the file path of the appropriate flag
                }
                return ''; // Otherwise return nothing
            })
            .attr('x', d => -d.radius * 0.7)
            .attr('y', d => -d.radius * 0.7)
            .attr('height', d => d.radius * 2 * 0.7)
            .attr('width', d => d.radius * 2 * 0.7); // Position it based on the radius of the circle

        this.simulation.nodes(this.nodes).on('tick', function () { // Function for nodes on each simulation tick
            this.node = d3.select('svg').selectAll('.node').attr('transform', d => `translate(${d.x},${d.y})`).select('circle').attr('r', d => d.r);
            // Update their transforms and circle radii as appropriate
        });

        const slidercon = d3.select('#' + this.id).append('div') // Create slider within visualisation div
            .classed('slidecontainer', true); // Give it a class

        this.slider = slidercon.append('input') // Append an input
            .attr('type', 'range') // Of type range
            .attr('min', this.syear)
            .attr('max', this.eyear)
            .attr('value', this.syear) // Base starting attributes on years specified in class constructor
            .classed('slider', true) // Class input as slider
            .attr('id', 'slide');

        this.slider.on('input', function () {
            self.updateVis(+this.value); // On input, update the visualisation
        });

        this.yeartext = d3.select('#' + this.id).append('h2').text(this.syear); // Create a text element to show the user which year they have selected

        const sizeScale = d3.scaleOrdinal()
            .domain([this.lowtag, this.hightag])
            .range([5, 10]); // Create a legend to indicate what the circles mean

        const legendSize = d3.legendSize()
            .scale(sizeScale)
            .shape('circle')
            .shapePadding(10)
            .labelAlign('end'); // Creates the actual circles for the legend

        this.svg.append('g')
            .classed('legend-size', true)
            .attr('text-anchor', 'start')
            .attr('transform', 'translate(150, 25)')
            .style('font-size', '12px')
            .call(legendSize); // Displays the legend
    }

    /**
     * Method to switch the visualisation to a new year in the dataset. This updates all nodes in the visualisation with the new data and begins a transition effect to the new values. This is called whenever the visualisation's slider is changed.
     * @param {Number} year - The year to switch to within the dataset. If the year is outside of the range given in the constructor by syear and eyear, the method will immediately return.
     */
    updateVis (year) {
        if (year > this.eyear || year < this.syear) { // If the year is out of range (given the years set), then we can't set it to this, so there's no point trying
            return; // Exit the function
        }
        this.simulation.alpha(0.2).restart(); // Restart the simulation
        const index = year - this.syear; // Calculate the index of the data series we need to get
        this.yeartext.text(year); // Update the year text
        this.node.selectAll('circle').transition().duration(2000).ease(d3.easePolyOut) // Select all circles and perform a transition
            .tween('attr.r', (d) => {
                const newr = Math.sqrt(d.value[index]) * 0.0050; // Calculate what the new radius ought to be
                const ir = d3.interpolateNumber(d.r, newr); // Interpolate between the old radius and the new one
                return (t) => { // On every tick
                    d.r = ir(t); // Update the radius
                    this.simulation.force('collide', this.forceCollide); // Update the force
                };
            });
        this.node._groups[0].forEach((k) => { // Iterates over each node manually (we have to do this because d3 doesn't let me access the images otherwise)
            const img = d3.select(k.lastChild); // Select the image (which is the last child since it is the last thing we add to the node)
            const r = Math.sqrt(k.__data__.value[index]) * 0.0050; // Calculate the radius of the circle (since the transition is still happening, anything we get from the circle might not be accurate)
            img.attr('height', r * 2 * 0.7);
            img.attr('width', r * 2 * 0.7);
            img.attr('x', -r * 0.7);
            img.attr('y', -r * 0.7); // Adjust all attributes - it's a shame this isn't a transition but there's not much I can do about it
        });
        this.simulation.alphaTarget(0); // Target the simulation towards 0 alpha (i.e. everything calms down to stationary)
    }

    /**
     * This processes a row of a csv file and creates a correct data item valid for [startVis()]{@link Visualisation#startVis}, assuming that the csv is of the right format. Normally there's no reason for you to call this yourself - if you have a csv it's better to use [startVisFromCSV()]{@link Visualisation#startVisFromCSV}.
     * @param {Object} d - The row of csv (as an object - easiest to produce via d3.csv). This should contain a property of 'Country Name', 'Country Code' and one for each year within the range you intend to show in the visualisation.
     * @returns {Object} An object representing a valid data item for [startVis()]{@link Visualisation#startVis}. Passing an array of these into [startVis()]{@link Visualisation#startVis} would be a valid parameter for that method.
     */
    processRow (d) { // Function to process each row
        const dataseries = []; // Array to store dataseries
        for (let i = this.syear; i <= this.eyear; i++) { // Iterate over every year in the dataset
            let result = parseInt(d[i]);
            if (!result) {
                result = 0;
            }
            dataseries.push(result); // Add the data for the year into the array
        }
        return {
            name: d['Country Name'], // Returns the country name,
            code: d['Country Code'], // The country code
            dseries: dataseries // And the data set
        };
    }
}
