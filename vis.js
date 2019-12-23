class Visualisation {
    constructor (pathtocsv, syear, eyear, lowlegtag = 'less', highlegtag = 'more') {
        this.svg = d3.select('svg');
        this.width = document.body.clientWidth;
        this.height = +this.svg.attr('height');
        this.centerX = this.width * 0.5;
        this.centerY = this.height * 0.5;
        this.strength = 0.20;
        this.syear = syear;
        this.eyear = eyear;
        this.lowtag = lowlegtag;
        this.hightag = highlegtag;

        this.format = d3.format(',d');

        this.scaleColor = d3.scaleOrdinal(d3.schemeCategory20);

        this.excludes = ['ARB', 'CEB', 'CSS', 'EAP', 'EAR', 'EAS', 'ECA', 'ECS', 'EMU', 'EUU', 'FCS', 'HIC', 'HPC', 'IBD', 'IBT', 'IDA', 'IDB', 'IDX', 'INX', 'LAC', 'LCN', 'LDC', 'LIC', 'LMC', 'LMY', 'LTE', 'MEA', 'MIC', 'MNA', 'NAC', 'OED', 'OSS', 'PRE', 'PSS', 'PST', 'SSA', 'SSF', 'SST', 'TEA', 'TEC', 'TLA', 'TMN', 'TSA', 'TSS', 'UMC', 'WLD', 'SAS'];
        // This list contains all of the iso-3 country codes appearing in world bank datasets that aren't actually countries (but are instead groups of countries)

        const self = this; // This is a weird hack to let us call the d3 function from inside the class
        d3.csv(pathtocsv, this.processRow, function (data) {
            self.startVis(data);
        });

        // this.startVis();
    }

    startVis (dat) {
        dat = dat.filter(el => {
            return !(this.excludes.includes(el.code));
        });
        console.log(dat);
        this.data = dat; // So we can use the data in other functions
        this.pack = d3.pack().size([this.width, this.height]).padding(1.5);
        this.forceCollide = d3.forceCollide(d => d.r + 1);
        this.simulation = d3.forceSimulation().force('charge', d3.forceManyBody()).force('collide', this.forceCollide).force('x', d3.forceX(this.centerX).strength(this.strength)).force('y', d3.forceY(this.centerY).strength(this.strength));
        // reduce number of circles on mobile screen due to slow computation
        if ('matchMedia' in window && window.matchMedia('(max-device-width: 767px)').matches) {
            dat = dat.filter(el => {
            return el.dseries[0][1] >= 500000;
            });
        }

        this.root = d3.hierarchy({ children: dat }).sum(function (d) {
            if (d.dseries == undefined) {
                return 0;
            } else {
                return d.dseries.slice(-1)[1];
            }
        });

        this.nodes = this.pack(this.root).leaves().map(node => {
            const data = node.data;
            // console.log(data);
            // console.log(data.dseries[0][1]);
            // console.log(node.r);
            return {
                x: this.centerX + (node.x - this.centerX) * 3, // magnify start position to have transition to center movement
                y: this.centerY + (node.y - this.centerY) * 3,
                r: 0, // for tweening
                radius: Math.sqrt(data.dseries[0][1]) * 0.0050, // original radius
                id: data.code,
                name: data.name,
                value: data.dseries
                // icon: data.icon,
                // desc: data.desc,
            };
        });

        const self = this;

        this.svg.style('background-color', '#eee');
        this.node = this.svg.selectAll('.node')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (d) => {
                if (!d3.event.active) self.simulation.alphaTarget(0.2).restart();
                d.fx = d.x;
                d.fy = d.y;
                console.log(d.x, d.y);
            })
            .on('drag', (d) => {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            })
            .on('end', (d) => {
                if (!d3.event.active) self.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));

        this.node.append('circle')
            .attr('id', d => d.id)
            .attr('r', 0)
            .style('fill', d => this.scaleColor(d.cat))
            .transition().duration(2000).ease(d3.easeElasticOut)
                .tween('circleIn', function (d) {
                const i = d3.interpolateNumber(0, d.radius);
                return (t) => {
                    d.r = i(t);
                    self.simulation.force('collide', self.forceCollide);
                };
                });

        this.node.append('image')
            .classed('node-icon', true)
            .attr('clip-path', d => `url(#clip-${d.id})`)
            .attr('xlink:href', d => {
                const mapping = { AFG: 'AF', ALA: 'AX', ALB: 'AL', DZA: 'DZ', ASM: 'AS', AND: 'AD', AGO: 'AO', AIA: 'AI', ATA: 'AQ', ATG: 'AG', ARG: 'AR', ARM: 'AM', ABW: 'AW', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH', BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ', BMU: 'BM', BTN: 'BT', BOL: 'BO', BIH: 'BA', BWA: 'BW', BVT: 'BV', BRA: 'BR', VGB: 'VG', IOT: 'IO', BRN: 'BN', BGR: 'BG', BFA: 'BF', BDI: 'BI', KHM: 'KH', CMR: 'CM', CAN: 'CA', CPV: 'CV', CYM: 'KY', CAF: 'CF', TCD: 'TD', CHL: 'CL', CHN: 'CN', HKG: 'HK', MAC: 'MO', CXR: 'CX', CCK: 'CC', COL: 'CO', COM: 'KM', COG: 'CG', COD: 'CD', COK: 'CK', CRI: 'CR', CIV: 'CI', HRV: 'HR', CUB: 'CU', CYP: 'CY', CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DMA: 'DM', DOM: 'DO', ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', ETH: 'ET', FLK: 'FK', FRO: 'FO', FJI: 'FJ', FIN: 'FI', FRA: 'FR', GUF: 'GF', PYF: 'PF', ATF: 'TF', GAB: 'GA', GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH', GIB: 'GI', GRC: 'GR', GRL: 'GL', GRD: 'GD', GLP: 'GP', GUM: 'GU', GTM: 'GT', GGY: 'GG', GIN: 'GN', GNB: 'GW', GUY: 'GY', HTI: 'HT', HMD: 'HM', VAT: 'VA', HND: 'HN', HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE', IMN: 'IM', ISR: 'IL', ITA: 'IT', JAM: 'JM', JPN: 'JP', JEY: 'JE', JOR: 'JO', KAZ: 'KZ', KEN: 'KE', KIR: 'KI', PRK: 'KP', KOR: 'KR', KWT: 'KW', KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB', LSO: 'LS', LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT', LUX: 'LU', MKD: 'MK', MDG: 'MG', MWI: 'MW', MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT', MHL: 'MH', MTQ: 'MQ', MRT: 'MR', MUS: 'MU', MYT: 'YT', MEX: 'MX', FSM: 'FM', MDA: 'MD', MCO: 'MC', MNG: 'MN', MNE: 'ME', MSR: 'MS', MAR: 'MA', MOZ: 'MZ', MMR: 'MM', NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL', ANT: 'AN', NCL: 'NC', NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG', NIU: 'NU', NFK: 'NF', MNP: 'MP', NOR: 'NO', OMN: 'OM', PAK: 'PK', PLW: 'PW', PSE: 'PS', PAN: 'PA', PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH', PCN: 'PN', POL: 'PL', PRT: 'PT', PRI: 'PR', QAT: 'QA', REU: 'RE', ROU: 'RO', RUS: 'RU', RWA: 'RW', BLM: 'BL', SHN: 'SH', KNA: 'KN', LCA: 'LC', MAF: 'MF', SPM: 'PM', VCT: 'VC', WSM: 'WS', SMR: 'SM', STP: 'ST', SAU: 'SA', SEN: 'SN', SRB: 'RS', SYC: 'SC', SLE: 'SL', SGP: 'SG', SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO', ZAF: 'ZA', SGS: 'GS', SSD: 'SS', ESP: 'ES', LKA: 'LK', SDN: 'SD', SUR: 'SR', SJM: 'SJ', SWZ: 'SZ', SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW', TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL', TGO: 'TG', TKL: 'TK', TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM', TCA: 'TC', TUV: 'TV', UGA: 'UG', UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US', UMI: 'UM', URY: 'UY', UZB: 'UZ', VUT: 'VU', VEN: 'VE', VNM: 'VN', VIR: 'VI', WLF: 'WF', ESH: 'EH', YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW', XKX: 'XK' };
                const code = mapping[d.id];
                if (code) {
                    return 'img/' + code.toLowerCase() + '.svg';
                }
                return '';
            })
            .attr('x', d => -d.radius * 0.7)
            .attr('y', d => -d.radius * 0.7)
            .attr('height', d => d.radius * 2 * 0.7)
            .attr('width', d => d.radius * 2 * 0.7);

        this.simulation.nodes(this.nodes).on('tick', function () {
            this.node = d3.select('svg').selectAll('.node').attr('transform', d => `translate(${d.x},${d.y})`).select('circle').attr('r', d => d.r);
        });

        const slidercon = d3.select('#vis').append('div')
            .classed('slidecontainer', true);

        this.slider = slidercon.append('input')
            .attr('type', 'range')
            .attr('min', this.syear)
            .attr('max', this.eyear)
            .attr('value', this.syear)
            .classed('slider', true)
            .attr('id', 'slide');

        this.slider.on('input', function () {
            self.updateVis(+this.value);
        });

        this.yeartext = d3.select('#vis').append('h2').text(this.syear);

        const scaleColor = d3.scaleOrdinal(d3.schemeCategory20);

        const legendOrdinal = d3.legendColor()
            .scale(scaleColor)
            .shape('circle');

        const legend = this.svg.append('g')
            .classed('legend-color', true)
            .attr('text-anchor', 'start')
            .attr('transform', 'translate(20,30)')
            .style('font-size', '12px')
            .call(legendOrdinal);

        const sizeScale = d3.scaleOrdinal()
            .domain([this.lowtag, this.hightag])
            .range([5, 10]);

        const legendSize = d3.legendSize()
            .scale(sizeScale)
            .shape('circle')
            .shapePadding(10)
            .labelAlign('end');

        const legend2 = this.svg.append('g')
            .classed('legend-size', true)
            .attr('text-anchor', 'start')
            .attr('transform', 'translate(150, 25)')
            .style('font-size', '12px')
            .call(legendSize);
    }

    updateVis (year) {
        this.simulation.alpha(0.2).restart();
        const index = year - this.syear;
        this.yeartext.text(year);
        console.log(index);
        this.node.selectAll('circle').transition().duration(2000).ease(d3.easeElasticOut)
            .tween('attr.r', (d) => {
                const newr = Math.sqrt(d.value[index][1]) * 0.0050;
                const ir = d3.interpolateNumber(d.r, newr);
                return (t) => {
                    d.r = ir(t);
                    this.simulation.force('collide', this.forceCollide);
                };
            });
        this.simulation.alphaTarget(0);
    }

    test () {
        console.log(this.node);
    }

    ticked () {
        this.node
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .select('circle')
                .attr('r', d => d.r);
    }

    processRow (d) { // Function to process each row
        const dataseries = []; // Array to store dataseries
        for (let i = 1961; i < 2019; i++) { // Iterate over every year in the dataset
            let result = parseInt(d[i]);
            if (!result) {
                result = 0;
            }
            dataseries.push([i.toString(), result]); // Add a two-element array containing the year and the stat
        }
        return {
            name: d['Country Name'], // Returns the country name,
            code: d['Country Code'], // The country code
            dseries: dataseries // And the data set
        };
    }
}
