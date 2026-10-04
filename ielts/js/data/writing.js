/* Writing prompts. All data is invented for practice. Task 1 prompts carry a chart spec rendered by charts.js. */
(function () {
  const INSTR = 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.';
  const T1 = [
    {
      id: 't1-line-phones', kind: 'line',
      q: 'The graph shows the percentage of the population who owned a smartphone in three countries between 2010 and 2024. ' + INSTR,
      chart: { type: 'line', title: 'Smartphone ownership, 2010–2024', sub: 'Practice data (invented)', categories: ['2010', '2012', '2014', '2016', '2018', '2020', '2022', '2024'], y: { label: '% of population', min: 0, max: 100, step: 20, unit: '%' }, x: { label: 'Year' }, series: [{ name: 'Country A', data: [8, 18, 32, 48, 63, 74, 83, 88] }, { name: 'Country B', data: [15, 28, 41, 52, 60, 66, 71, 74] }, { name: 'Country C', data: [2, 5, 11, 20, 33, 47, 61, 72] }] }
    },
    {
      id: 't1-line-energy', kind: 'line',
      q: 'The graph shows the annual production of crude oil and natural gas in one country from 1990 to 2020, with projections for 2030. ' + INSTR,
      chart: { type: 'line', title: 'Oil and gas production, 1990–2030', sub: 'Practice data (invented). Figures for 2030 are projections.', categories: ['1990', '2000', '2010', '2020', '2030*'], y: { label: 'Million tonnes of oil equivalent', min: 0, max: 150, step: 30, unit: ' Mtoe' }, x: { label: 'Year (*projected)' }, series: [{ name: 'Crude oil', data: [120, 135, 128, 96, 70] }, { name: 'Natural gas', data: [40, 62, 88, 105, 118] }] }
    },
    {
      id: 't1-bar-students', kind: 'bar',
      q: 'The chart shows the average number of hours per week that university students in five countries spend studying and in paid work. ' + INSTR,
      chart: { type: 'bar', title: 'Weekly study and paid-work hours of university students', sub: 'Practice data (invented)', categories: ['Country A', 'Country B', 'Country C', 'Country D', 'Country E'], y: { label: 'Hours per week', min: 0, max: 35, step: 5, unit: ' h' }, series: [{ name: 'Study', data: [22, 18, 26, 30, 20] }, { name: 'Paid work', data: [14, 20, 8, 4, 11] }] }
    },
    {
      id: 't1-hbar-reasons', kind: 'bar',
      q: 'The chart shows the main reason given by male and female students for choosing their university. ' + INSTR,
      chart: { type: 'bar', horizontal: true, title: 'Main reason for choosing a university, by gender', sub: 'Practice data (invented). Each group sums to 100%.', categories: ['Course quality', 'Location', 'Cost', 'Reputation', 'Social life'], y: { label: '% of respondents', min: 0, max: 50, step: 10, unit: '%' }, series: [{ name: 'Male', data: [34, 22, 20, 15, 9] }, { name: 'Female', data: [41, 18, 16, 17, 8] }] }
    },
    {
      id: 't1-pie-energy', kind: 'pie',
      q: 'The pie charts show how an average household in one country used energy in 1990 and in 2020. ' + INSTR,
      chart: { type: 'pie', title: 'Household energy use by purpose', sub: 'Practice data (invented)', unit: '%', pies: [{ title: '1990', slices: [{ name: 'Space heating', value: 54 }, { name: 'Water heating', value: 18 }, { name: 'Lighting', value: 8 }, { name: 'Appliances & electronics', value: 12 }, { name: 'Cooking', value: 8 }] }, { title: '2020', slices: [{ name: 'Space heating', value: 38 }, { name: 'Water heating', value: 17 }, { name: 'Lighting', value: 6 }, { name: 'Appliances & electronics', value: 27 }, { name: 'Cooking', value: 12 }] }] }
    },
    {
      id: 't1-stack-commute', kind: 'bar',
      q: 'The chart shows how people in one city travelled to work in 1995, 2005, 2015 and 2025. ' + INSTR,
      chart: { type: 'bar', stacked: true, title: 'Mode of travel to work', sub: 'Practice data (invented). Each bar sums to 100%.', categories: ['1995', '2005', '2015', '2025'], y: { label: '% of commuters', min: 0, max: 100, step: 20, unit: '%' }, series: [{ name: 'Car', data: [58, 55, 47, 38] }, { name: 'Public transport', data: [22, 25, 27, 30] }, { name: 'Cycling', data: [4, 6, 11, 16] }, { name: 'Walking', data: [16, 14, 15, 16] }] }
    },
    {
      id: 't1-table-internet', kind: 'table',
      q: 'The table shows the percentage of households with internet access in four countries in 2005, 2015 and 2025. ' + INSTR,
      chart: { type: 'table', title: 'Households with internet access (%)', sub: 'Practice data (invented)', head: ['Country', '2005', '2015', '2025'], rows: [['A', '12', '48', '91'], ['B', '25', '71', '96'], ['C', '4', '22', '63'], ['D', '38', '80', '94']] }
    },
    {
      id: 't1-table-power', kind: 'table',
      q: 'The table shows the proportion of electricity generated from four sources in one country in 1995, 2005 and 2015. ' + INSTR,
      chart: { type: 'table', title: 'Electricity generation by source (%)', sub: 'Practice data (invented)', head: ['Source', '1995', '2005', '2015'], rows: [['Coal', '52', '41', '22'], ['Gas', '20', '28', '31'], ['Nuclear', '18', '17', '15'], ['Renewables', '10', '14', '32']] }
    },
    {
      id: 't1-process-frac', kind: 'process',
      q: 'The diagram shows the main stages of a hydraulic fracturing operation used to produce oil and gas. Summarise the information by selecting and reporting the main features.',
      chart: { type: 'process', cols: 3, title: 'Stages in a hydraulic fracturing operation', sub: 'Simplified diagram for practice', steps: ['Water, sand and chemical additives are mixed on site', 'Fracturing fluid is pumped down the cased well at high pressure', 'Fluid leaves through perforations and cracks the rock', 'Sand (proppant) enters the cracks and holds them open', 'Pumping stops and the pressure is released', 'Part of the fluid flows back to the surface', 'Flowback water is stored, treated or recycled', 'Oil or gas flows through the propped cracks into the well'] }
    },
    {
      id: 't1-process-recycle', kind: 'process',
      q: 'The diagram shows how plastic bottles are recycled into new products. Summarise the information by selecting and reporting the main features.',
      chart: { type: 'process', cols: 4, title: 'Recycling of plastic bottles', sub: 'Practice diagram', steps: ['Bottles are collected from homes and public bins', 'Bottles are sorted by type and colour', 'Sorted bottles are crushed and pressed into bales', 'Bales are shredded into small flakes', 'Flakes are washed and dried', 'Flakes are melted and formed into pellets', 'Pellets are used to manufacture new products', 'New products are sold to consumers'] }
    },
    {
      id: 't1-map-village', kind: 'map',
      q: 'The maps show the centre of the village of Ashby in 2000 and in 2020. ' + INSTR,
      chart: {
        type: 'map', title: 'Ashby village centre', sub: 'Fictional maps for practice',
        maps: [
          {
            label: '2000', w: 380, h: 300, shapes: [
              { t: 'road', pts: [[0, 150], [380, 150]], w: 12, label: 'Main Street' }, { t: 'road', pts: [[190, 150], [190, 300]], w: 10 },
              { t: 'rect', x: 40, y: 100, w: 70, h: 38, label: 'Post office' }, { t: 'rect', x: 120, y: 100, w: 60, h: 38, label: 'Grocery store' },
              { t: 'rect', x: 60, y: 30, w: 60, h: 40, label: 'Church' }, { t: 'rect', x: 210, y: 20, w: 150, h: 100, k: 'green', label: 'Farmland' },
              { t: 'rect', x: 30, y: 168, w: 140, h: 40, k: 'home', label: 'Houses' }, { t: 'rect', x: 215, y: 170, w: 110, h: 50, k: 'water', label: 'Pond' },
              { t: 'rect', x: 215, y: 235, w: 110, h: 40, label: 'Primary school' }
            ]
          },
          {
            label: '2020', w: 380, h: 300, shapes: [
              { t: 'road', pts: [[0, 150], [380, 150]], w: 12, label: 'Main Street' }, { t: 'road', pts: [[190, 150], [190, 300]], w: 10 },
              { t: 'road', pts: [[0, 290], [380, 290]], w: 10, label: 'New bypass' },
              { t: 'rect', x: 40, y: 100, w: 70, h: 38, label: 'Café' }, { t: 'rect', x: 114, y: 92, w: 70, h: 46, label: 'Supermarket' },
              { t: 'rect', x: 60, y: 30, w: 60, h: 40, label: 'Church' }, { t: 'rect', x: 210, y: 20, w: 150, h: 100, k: 'home', label: 'New housing estate' },
              { t: 'rect', x: 30, y: 168, w: 140, h: 40, k: 'home', label: 'Houses' }, { t: 'rect', x: 30, y: 214, w: 140, h: 36, k: 'car', label: 'Car park' },
              { t: 'rect', x: 215, y: 170, w: 110, h: 50, k: 'green', label: 'Park' }, { t: 'trees', x: 218, y: 174, w: 100, h: 42, n: 6 },
              { t: 'rect', x: 215, y: 235, w: 110, h: 40, label: 'Primary school and sports hall' }
            ]
          }
        ]
      }
    }
  ];

  const T2 = [
    ['education', 'Opinion', 'Some people believe that universities should focus on teaching practical skills for employment rather than academic knowledge. To what extent do you agree or disagree?'],
    ['science', 'Discuss both views', 'Some people think governments should spend money on exploring space, while others believe this money should be used to solve problems on Earth. Discuss both views and give your own opinion.'],
    ['technology', 'Problem–solution', 'In many countries, young people are spending less time outdoors and more time on screens. What problems does this cause, and what measures could be taken to address them?'],
    ['work', 'Advantages/disadvantages', 'More and more people are working from home instead of in an office. Do the advantages of this trend outweigh the disadvantages?'],
    ['energy', 'Two-part question', 'Many countries still depend heavily on fossil fuels. Why is this the case? What can be done to encourage the use of renewable energy?'],
    ['science', 'Opinion', 'Some argue that scientific research should be funded mainly by governments rather than private companies. To what extent do you agree or disagree?'],
    ['transport', 'Problem–solution', 'Traffic congestion is a growing problem in large cities. What are the main causes, and what solutions can you suggest?'],
    ['education', 'Discuss both views', 'Some people believe children should start learning a foreign language at primary school, while others think secondary school is a better time. Discuss both views and give your opinion.'],
    ['crime', 'Discuss both views', 'Some people think the best way to reduce crime is to give longer prison sentences. Others believe there are better alternatives. Discuss both views and give your own opinion.'],
    ['society', 'Advantages/disadvantages', 'In many countries the proportion of older people is rising. Is this a positive or negative development?'],
    ['society', 'Opinion', 'Some people say that advertising encourages people to buy things they do not need. To what extent do you agree or disagree?'],
    ['transport', 'Opinion', 'Governments should spend more money on public transport than on building new roads. To what extent do you agree or disagree?'],
    ['economy', 'Two-part question', 'The gap between rich and poor is increasing in many countries. What are the causes of this, and what can be done to reduce it?'],
    ['culture', 'Discuss both views', 'Some people think that museums and historical sites should be free for everyone, while others believe visitors should pay. Discuss both views and give your opinion.'],
    ['environment', 'Opinion', 'Plastic waste is damaging oceans and wildlife. Who should take responsibility for dealing with this problem: individuals, companies or governments?'],
    ['education', 'Advantages/disadvantages', 'An increasing number of people are choosing to study online rather than attend university in person. Do the benefits outweigh the drawbacks?'],
    ['energy', 'Opinion', 'Some people believe that fossil fuel companies should be required to pay for the environmental damage they cause. To what extent do you agree or disagree?'],
    ['education', 'Discuss both views', 'Some people argue that children should learn practical skills such as cooking and managing money at school, while others think schools should focus on academic subjects. Discuss both views and give your opinion.'],
    ['science', 'Discuss both views', 'Animal testing is used in medical and scientific research. Some people believe it is necessary, while others think it should be banned. Discuss both views and give your own opinion.'],
    ['work', 'Problem–solution', 'Nowadays many people have very little free time. What are the causes of this, and how can people achieve a better balance between work and leisure?']
  ].map((x, i) => ({ id: 't2-' + (i + 1), topic: x[0], type: x[1], q: x[2] }));

  window.IELTS.data.writing = { T1, T2 };
})();
