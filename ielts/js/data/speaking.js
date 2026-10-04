/* Speaking question bank — original practice questions in the style of IELTS Parts 1–3. */
(function () {
  const part1 = [
    ['Hometown', ['Where is your hometown?', 'What do you like most about it?', 'Has your hometown changed much in recent years?', 'Would you like to live there in the future? Why?']],
    ['Work and studies', ['Do you work or are you a student?', 'Why did you choose that job or subject?', 'What do you find most challenging about it?', 'What would you like to do after you finish?']],
    ['Daily routine', ['What is your daily routine like?', 'Which part of the day do you enjoy most?', 'Has your routine changed in the last few years?', 'Do you prefer to plan your day or be spontaneous?']],
    ['Weather', ['What kind of weather do you like best?', 'Does the weather affect your mood?', 'What is the weather like in your country in summer?', 'Do you think weather forecasts are reliable?']],
    ['Technology', ['How often do you use the internet?', 'What do you mainly use your phone for?', 'Do you think people spend too much time on their phones?', 'Is there any technology you would like to learn to use?']],
    ['Food', ['What kind of food do you enjoy eating?', 'Do you cook often?', 'Has the food people eat in your country changed over time?', 'Do you prefer eating at home or in restaurants?']],
    ['Transport', ['How do you usually travel around your city?', 'Is public transport good where you live?', 'What would improve transport in your area?', 'Do you prefer travelling alone or with others?']],
    ['Free time', ['What do you like to do in your free time?', 'Is there a hobby you would like to take up?', 'Do you prefer relaxing or active hobbies?', 'How much free time do you have during the week?']],
    ['Reading', ['Do you enjoy reading?', 'What kinds of books or articles do you read?', 'Do you prefer paper books or e-books?', 'Did you read more when you were younger?']],
    ['Friends', ['Do you have many friends?', 'How do you usually keep in touch with them?', 'What do you like to do together?', 'Do you think friendship changes as people get older?']]
  ].map(x => ({ topic: x[0], qs: x[1] }));

  const part2 = [
    { t: 'Describe a person who has influenced you.', pts: ['who this person is', 'how you know them', 'what they did', 'and explain why they influenced you'], p3: ['Who influences young people most nowadays?', 'Is it better to learn from experience or from other people?', 'Do you think role models are important in society?', 'How has the influence of parents on children changed?', 'Can famous people have a negative influence on society?'] },
    { t: 'Describe a project or piece of work you are proud of.', pts: ['what it was', 'when and why you did it', 'who helped you', 'and explain why you are proud of it'], p3: ['Why do some people find it hard to complete long projects?', 'Is teamwork more effective than working alone?', 'How can employers motivate their staff?', 'Do people today set goals that are too ambitious?'] },
    { t: 'Describe a place you would like to visit in the future.', pts: ['where it is', 'how you would travel there', 'what you would do there', 'and explain why you want to go'], p3: ['How has tourism changed in your country?', 'Does tourism do more harm than good to local communities?', 'Will people travel less in the future?', 'Why do some people prefer holidays at home?'] },
    { t: 'Describe a time when you learned a new skill.', pts: ['what the skill was', 'how you learned it', 'what difficulties you had', 'and explain how it has helped you'], p3: ['What skills will be most important in the future?', 'Should schools teach practical skills such as cooking or budgeting?', 'Is it harder to learn new skills as an adult?', 'Can skills be learned effectively online?'] },
    { t: 'Describe a piece of technology you use every day.', pts: ['what it is', 'how often you use it', 'what you use it for', 'and explain why it is important to you'], p3: ['How has technology changed the way people communicate?', 'Are people too dependent on technology?', 'What technology do you expect to see in 20 years?', 'Does technology widen or narrow the gap between rich and poor?'] },
    { t: 'Describe a book or film that taught you something.', pts: ['what it was', 'when you read or watched it', 'what you learned from it', 'and explain why it was important to you'], p3: ['Do people read less than they used to?', 'Can films be as educational as books?', 'What makes a story memorable?', 'Should schools use films in lessons?'] },
    { t: 'Describe an occasion when you helped someone.', pts: ['who you helped', 'what the problem was', 'how you helped', 'and explain how you felt afterwards'], p3: ['Why do some people volunteer their time?', 'Should helping others be taught at school?', 'Do people help each other less in big cities?', 'Is it better to help with money or with time?'] },
    { t: 'Describe a place in your town or city where you like to spend time.', pts: ['where it is', 'what it looks like', 'what you do there', 'and explain why you like it'], p3: ['How important are public spaces in a city?', 'How have public spaces changed in your lifetime?', 'Should cities build more parks or more shopping centres?', 'Do young and old people use public spaces differently?'] }
  ];

  window.IELTS.data.speaking = { part1, part2 };
})();
