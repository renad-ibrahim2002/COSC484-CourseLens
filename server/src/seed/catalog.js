/**
 * Real Bahraini universities, majors and courses used by the seed.
 * Course codes and titles are taken from each university's published study plans:
 *   AUBH   aubh.edu.bh: AY 2025-26 / 2026-27 academic catalog and curriculum plans
 *          (BSc Computer Science, BSc Computer Engineering, BBA in Management, BBA in Finance).
 *          Web Engineering runs as COSC 484 / 484L in Fall 2026 (course outline); the catalog lists it as COSC 485.
 *   UOB    uob.edu.bh: College of IT and College of Business Administration study plans
 *          (BSc Computer Engineering 2018, BSc Banking and Finance 2020).
 *   BP     polytechnic.bh: Bachelor of Information and Communications Technology programme schedules
 *          (Programming, Networking, Management Information Systems and Cyber Security majors).
 *   AU     ahlia.edu.bh: BSIT 2024/25, BSCCE 2022/23, BSMS and BSID curriculum plans.
 * Each course: [code, title, majorCodes, description?, credits?]. Credits default to 3
 * (Bahrain Polytechnic courses are 15-credit courses on its 480-credit bachelor scale).
 */

const AUBH = {
  university: {
    name: 'American University of Bahrain',
    shortName: 'AUBH',
    location: 'Riffa, Bahrain',
    emailDomains: ['aubh.edu.bh'],
    status: 'active',
  },
  majors: [
    ['COSC', 'Computer Science'],
    ['CMPE', 'Computer Engineering'],
    ['MGMT', 'Business Administration (Management)'],
    ['FINC', 'Business Administration (Finance)'],
  ],
  courses: [
    [
      'COSC 101',
      'Introduction to Computing',
      ['COSC', 'CMPE'],
      'Computing fundamentals and problem solving with a first programming language.',
    ],
    ['COSC 102', 'Object-Oriented Programming', ['COSC', 'CMPE'], 'Classes, objects, inheritance, polymorphism and basic program design.'],
    [
      'COSC 125',
      'Data Structure and Programming Techniques',
      ['COSC', 'CMPE'],
      'Lists, stacks, queues, trees, hash tables and graphs, with complexity analysis.',
    ],
    [
      'CMPE 271',
      'Computer Organization',
      ['COSC', 'CMPE'],
      'How computers execute programs: data representation, assembly, memory and the CPU.',
    ],
    [
      'COSC 248',
      'Algorithms and Complexity',
      ['COSC'],
      'Design and analysis of algorithms: divide and conquer, greedy methods and dynamic programming.',
    ],
    ['COSC 312', 'Design and Usage of Databases', ['COSC', 'CMPE'], 'Relational modelling, SQL, normalisation, indexing and transactions.'],
    ['COSC 372', 'Operating Systems', ['COSC', 'CMPE'], 'Processes, threads, scheduling, memory management and file systems.'],
    ['CMPE 215', 'Communication Networks', ['COSC', 'CMPE'], 'Network layers, TCP/IP, routing, switching and network security basics.'],
    ['DSAI 465', 'Artificial Intelligence', ['COSC'], 'Search, knowledge representation, machine learning basics and the ethics of AI.'],
    ['CYBR 310', 'Introduction to Cybersecurity', ['COSC'], 'Threats, cryptography basics, secure coding and incident response.'],
    ['COSC 415', 'Cloud Computing', ['COSC'], 'Virtualisation, cloud service models, deployment and scaling.'],
    [
      'COSC 499A',
      'Computer Science Design Project A',
      ['COSC'],
      'First part of the senior design project: requirements, design and a prototype.',
    ],
    [
      'COSC 499B',
      'Computer Science Design Project B',
      ['COSC'],
      'Second part of the senior design project: implementation, testing and presentation.',
    ],
    [
      'SWEN 360',
      'Software Design and Engineering',
      ['COSC', 'CMPE'],
      'Software processes, requirements, design patterns, testing and team projects.',
    ],
    [
      'COSC 484',
      'Web Engineering',
      ['COSC'],
      'Full-stack web application development: front-end frameworks, REST APIs, databases, authentication, testing and deployment.',
    ],
    ['MATH 203', 'Discrete Mathematics', ['COSC', 'CMPE'], 'Logic, proofs, sets, relations, combinatorics and graphs.'],
    ['CMPE 270', 'Digital Systems', ['COSC', 'CMPE'], 'Boolean algebra, combinational and sequential circuits.'],
    ['ELEC 320', 'Circuit Analysis', ['CMPE'], 'DC and AC circuit analysis techniques and network theorems.'],
    ['CMPE 412', 'Microprocessors', ['CMPE'], 'Microprocessor architecture, assembly programming and interfacing.'],
    ['CMPE 478', 'Embedded Systems Programming', ['CMPE'], 'Programming microcontrollers, peripherals and real-time behaviour.'],
    ['MGMT 101', 'Principles of Management', ['MGMT', 'FINC'], 'Planning, organising, leading and controlling in organisations.'],
    ['ENGL 205', 'Business Communication', ['MGMT', 'FINC'], 'Professional writing, presentations and workplace communication.'],
    ['MRKG 101', 'Principles of Marketing', ['MGMT', 'FINC'], 'Markets, consumers and the marketing mix.'],
    ['MGMT 205', 'Organizational Behavior', ['MGMT', 'FINC'], 'Motivation, teams, leadership and culture at work.'],
    ['MGMT 301', 'Operations Management', ['MGMT'], 'Processes, quality, supply chains and capacity planning.'],
    ['MGMT 380', 'Project Management', ['MGMT'], 'Scoping, scheduling, budgeting and controlling projects.'],
    ['BUSN 301', 'Business Law', ['MGMT', 'FINC'], 'Contracts, companies and commercial law.'],
    ['MGMT 410', 'Business Policy and Strategic Management', ['MGMT', 'FINC'], 'Competitive strategy and the capstone business case.'],
    ['ACCT 101', 'Introduction to Financial Accounting', ['MGMT', 'FINC'], 'Recording transactions and preparing financial statements.'],
    ['ACCT 102', 'Introduction to Managerial Accounting', ['MGMT', 'FINC'], 'Costing, budgeting and decision making.'],
    ['ACCT 311', 'Intermediate Accounting', ['FINC'], 'IFRS reporting for assets, liabilities and equity.'],
    ['FINC 221', 'Banking', ['FINC'], 'How banks work: deposits, lending, regulation and risk.'],
    ['FINC 231', 'Managerial Finance', ['FINC'], 'Working capital, budgeting and short-term financial decisions.'],
    ['FINC 311', 'Corporate Finance', ['FINC'], 'Time value of money, valuation and capital budgeting.'],
    ['FINC 411', 'Investments and Portfolio Management', ['FINC'], 'Securities, risk and return, and building portfolios.'],
    ['ENGL 101', 'Composition I', ['COSC', 'CMPE', 'MGMT', 'FINC'], 'Academic reading, argument and essay writing.'],
  ],
};

const UOB = {
  university: {
    name: 'University of Bahrain',
    shortName: 'UOB',
    location: 'Sakhir, Bahrain',
    emailDomains: ['uob.edu.bh', 'stu.uob.edu.bh'],
    status: 'active',
  },
  majors: [
    ['CS', 'Computer Science'],
    ['CE', 'Computer Engineering'],
    ['ACC', 'Accounting'],
    ['BF', 'Banking and Finance'],
  ],
  courses: [
    ['ITCS 113', 'Computer Programming I', ['CS', 'CE'], 'Problem solving, control structures, methods and arrays in Java.'],
    ['ITCS 114', 'Computer Programming II', ['CS', 'CE'], 'Object-oriented programming, recursion and file handling.'],
    ['ITCS 214', 'Data Structures', ['CS', 'CE'], 'Linked lists, stacks, queues, trees and sorting and searching.'],
    ['ITCS 254', 'Discrete Structures I', ['CS', 'CE'], 'Logic, sets, functions, relations and counting.'],
    ['ITCS 325', 'Operating Systems', ['CS', 'CE'], 'Processes, scheduling, memory management and file systems.'],
    ['ITCS 330', 'Database Driven Websites', ['CE'], 'Building web applications backed by relational databases.'],
    ['ITCE 112', 'Digital Design I', ['CE'], 'Number systems, Boolean algebra and combinational logic.'],
    ['ITCE 230', 'Microprocessors', ['CE'], 'Microprocessor architecture, assembly language and interfacing.'],
    ['ITCE 331', 'Embedded Systems', ['CE'], 'Microcontroller-based design and real-time programming.'],
    ['ITCE 353', 'Computer Networks', ['CE'], 'Network architectures, protocols and the TCP/IP stack.'],
    ['ITCE 473', 'Cybersecurity', ['CE'], 'Security threats, cryptography and network defence.'],
    ['ACC 112', 'Financial Accounting I', ['ACC', 'BF'], 'The accounting cycle and basic financial statements.'],
    ['ACC 113', 'Financial Accounting II', ['ACC', 'BF'], 'Accounting for assets, liabilities, equity and cash flows.'],
    ['ACC 211', 'Intermediate Accounting I', ['ACC'], 'Financial reporting standards and measurement of assets.'],
    ['ACC 221', 'Cost Accounting', ['ACC'], 'Job and process costing, cost behaviour and allocation.'],
    ['ACC 231', 'Auditing I', ['ACC'], 'Audit planning, internal control, evidence and reporting.'],
    ['ACC 325', 'Managerial Accounting', ['ACC'], 'Budgeting, performance measurement and decision making.'],
    ['ECON 140', 'Microeconomics', ['ACC', 'BF'], 'Supply and demand, consumer choice and market structures.'],
    ['FIN 220', 'Financial Management I', ['ACC', 'BF'], 'Financial analysis, time value of money and valuation.'],
    ['FIN 221', 'Financial Markets and Institutions', ['BF'], 'How financial markets and institutions operate.'],
    ['BANK 248', 'Money and Banking', ['BF'], 'Money, interest rates, central banking and monetary policy.'],
    ['BANK 323', 'Commercial Banking', ['BF'], 'Bank operations, lending and asset-liability management.'],
    ['SBF 270', 'Islamic Banking and Finance', ['BF'], 'Principles and instruments of Islamic banking and finance.'],
    ['FIN 424', 'Investment Management', ['BF'], 'Securities analysis, risk and return, and investment strategy.'],
  ],
};

const BP = {
  university: {
    name: 'Bahrain Polytechnic',
    shortName: 'BP',
    location: 'Isa Town, Bahrain',
    emailDomains: ['polytechnic.bh'],
    status: 'active',
  },
  majors: [
    ['PROG', 'Information and Communications Technology (Programming)'],
    ['NET', 'Information and Communications Technology (Networking)'],
    ['MIS', 'Information and Communications Technology (Management Information Systems)'],
    ['CYB', 'Information and Communications Technology (Cyber Security)'],
  ],
  courses: [
    ['IT6008', 'Computer Programming 1', ['PROG', 'NET', 'MIS', 'CYB'], 'Programming fundamentals and problem solving.'],
    ['IT6005', 'Database Systems 1', ['PROG', 'NET', 'MIS', 'CYB'], 'Relational databases, data modelling and SQL.'],
    ['IT6003', 'Networks and Data Communications', ['PROG', 'NET', 'MIS', 'CYB'], 'Network models, media, addressing and protocols.'],
    ['IT6011', 'Introduction to Information Security', ['PROG', 'NET', 'MIS', 'CYB'], 'Security principles, threats and controls.'],
    ['IT6012', 'Web Fundamentals', ['PROG', 'NET', 'MIS', 'CYB'], 'HTML, CSS, client-side scripting and web standards.'],
    ['IT7001', 'Systems Analysis and Design', ['PROG', 'NET', 'MIS', 'CYB'], 'Gathering requirements and modelling information systems.'],
    ['IT7008', 'Computer Programming 2', ['PROG'], 'Object-oriented programming and larger program design.'],
    ['IT7006', 'Object-Oriented Design', ['PROG'], 'UML, design principles and design patterns.'],
    ['IT7009', 'Artificial Intelligence', ['PROG', 'NET'], 'Intelligent agents, search and machine learning basics.'],
    ['IT8108', 'Mobile Programming', ['PROG'], 'Building native mobile applications.'],
    ['IT8118', 'Advanced Programming', ['PROG'], 'Advanced language features, concurrency and testing.'],
    ['IT8101', 'Games Development', ['PROG'], 'Game design and programming with a game engine.'],
    ['IT7003', 'Networking and Data Communications 2', ['NET', 'MIS', 'CYB'], 'Routing, switching and network services.'],
    ['IT7004', 'Operating Systems and Platforms', ['NET', 'MIS'], 'Operating system concepts and server platforms.'],
    ['IT8323', 'Advanced Networking', ['NET'], 'Advanced routing protocols and enterprise network design.'],
    ['IT8313', 'Wireless Communications', ['NET'], 'Wireless standards, design and security.'],
    ['IT8213', 'Data Centre Management', ['NET', 'MIS'], 'Data centre infrastructure, operations and availability.'],
    ['IT7202', 'Enterprise Resource Planning', ['MIS'], 'ERP systems and business process integration.'],
    ['IT8203', 'Systems Administration', ['MIS'], 'Administering servers, users and services.'],
    ['IT8212', 'Cloud Computing', ['MIS'], 'Cloud service models, deployment and management.'],
    ['IT8202', 'Infrastructure for eCommerce', ['MIS'], 'Technical infrastructure for online business.'],
    ['IT8505', 'Defence in Depth', ['NET', 'CYB'], 'Layered security architecture and controls.'],
    ['IT7301', 'Ethical Hacking', ['NET', 'CYB'], 'Penetration testing methods and tools.'],
  ].map(([code, title, majors, description]) => [code, title, majors, description, 15]),
};

const AU = {
  university: {
    name: 'Ahlia University',
    shortName: 'AU',
    location: 'Manama, Bahrain',
    emailDomains: ['ahlia.edu.bh'],
    status: 'active',
  },
  majors: [
    ['BSIT', 'Information Technology'],
    ['BSCCE', 'Computer and Communications Engineering'],
    ['BSMS', 'Multimedia Systems'],
    ['BSID', 'Interior Design'],
  ],
  courses: [
    ['ITCS 122', 'Introduction to Programming Techniques', ['BSIT', 'BSCCE', 'BSMS'], 'Problem solving and structured programming.'],
    ['ITCS 201', 'Object-Oriented Programming I', ['BSIT', 'BSCCE', 'BSMS'], 'Classes, objects and object-oriented design.'],
    ['ITCS 224', 'Data Structures', ['BSIT', 'BSCCE', 'BSMS'], 'Linear and non-linear data structures and their algorithms.'],
    ['ITCS 323', 'Database Systems: Design and Application', ['BSIT', 'BSCCE', 'BSMS'], 'Database design, SQL and database applications.'],
    ['ECTE 329', 'Computer Networks', ['BSIT', 'BSCCE', 'BSMS'], 'Network architectures, protocols and services.'],
    ['ITCS 409', 'Operating Systems', ['BSIT', 'BSCCE', 'BSMS'], 'Processes, memory, storage and operating system design.'],
    ['ITCS 313', 'Software Engineering I', ['BSIT'], 'Software life cycles, requirements and design.'],
    ['ITCS 404', 'Information Security Engineering', ['BSIT'], 'Designing and building secure information systems.'],
    ['ITCS 425', 'Web Engineering', ['BSIT'], 'Engineering and deploying web applications.'],
    ['ITCS 427', 'Mobile Computing', ['BSIT', 'BSMS'], 'Mobile platforms and application development.'],
    ['ECCE 201', 'Electric Circuits', ['BSCCE'], 'Circuit laws, analysis techniques and AC circuits.'],
    ['ECCE 203', 'Digital Logic', ['BSCCE'], 'Logic gates, combinational and sequential circuits.'],
    ['ECCE 303', 'Computer Architecture and Organization', ['BSCCE'], 'Processor design, memory hierarchy and I/O.'],
    ['ECCE 323', 'Microprocessors', ['BSCCE'], 'Microprocessor programming and interfacing.'],
    ['ECCE 403', 'Embedded Systems', ['BSCCE'], 'Design of embedded hardware and software.'],
    ['ECTE 224', 'Signals & Systems', ['BSCCE'], 'Continuous and discrete signals, transforms and filtering.'],
    ['ITMS 201', 'Introduction to Multimedia Systems', ['BSMS'], 'Media types, compression and multimedia tools.'],
    ['ITMS 302', 'Human Computer Interaction', ['BSIT', 'BSMS'], 'User-centred design, prototyping and usability evaluation.'],
    ['ITMS 313', 'Game Development I', ['BSMS'], 'Designing and programming 2D games.'],
    ['ITMS 325', 'Web Applications Design', ['BSMS'], 'Designing interactive web applications.'],
    ['ITMS 335', 'Web Programming I', ['BSMS'], 'Client- and server-side web programming.'],
    ['ITMS 426', '3D Graphics Software', ['BSMS'], '3D modelling, texturing and rendering.'],
    ['INTD 102', 'Introduction to Design', ['BSID'], 'Design elements, principles and the design process.'],
    ['INTD 207', 'Materials in Interior Design', ['BSID'], 'Finishes, furnishings and their selection.'],
    ['INTD 212', 'Elementary Residential Interior Design Studio', ['BSID'], 'Studio design of residential interiors.'],
    ['INTD 217', 'History of Interior Design', ['BSID'], 'Interior design and furniture through history.'],
    ['INTD 309', 'Building Information Modeling (BIM) I', ['BSID'], 'Modelling interiors with BIM software.'],
    ['INTD 319', 'Lighting in Interior Environments', ['BSID'], 'Natural and artificial lighting design for interiors.'],
  ],
};

/** AUBH first: it holds the demo accounts and sample reviews. */
module.exports = { UNIVERSITIES: [AUBH, UOB, BP, AU] };
