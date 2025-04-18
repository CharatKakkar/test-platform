// scripts/migrateExamsToFirebase.js
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

// This script will migrate your mock exam data to Firebase
// You can run this once to seed your database

const migrateExamsData = async () => {
  try {
    console.log('Starting exams migration to Firebase...');
    
    // Array of exam data from your existing mock data
    const examsData = [
      {
        id: 'mov5vp2L4yRny2oVAvXK',
        title: 'CompTIA A+ Certification',
        category: 'IT',
        description: 'Validate your understanding of hardware, software, and operational procedures.',
        price: 99.99,
        duration: '90 minutes',
        questionCount: 90,
        difficulty: 'Intermediate',
        popularity: 4.8,
        passingScore: 70,
        purchaseDetails: {
          validityDays: 365,
          includedFeatures: [
            'Full exam simulation',
            'Practice questions',
            'Study guides',
            'Performance analytics'
          ]
        },
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23275d8b"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EA+%3C/text%3E%3C/svg%3E'
      },
      {
        id: 'yYqhU0cGKpNfK8bxQEdY',
        title: 'AWS Certified Solutions Architect',
        category: 'Cloud',
        description: 'Master designing distributed systems on the AWS platform.',
        price: 149.99,
        duration: '120 minutes',
        questionCount: 65,
        difficulty: 'Advanced',
        popularity: 4.9,
        passingScore: 70,
        purchaseDetails: {
          validityDays: 365,
          includedFeatures: [
            'Full exam simulation',
            'Practice questions',
            'AWS integration examples',
            'Performance analytics'
          ]
        },
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23f90"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EAWS%3C/text%3E%3C/svg%3E'
      },
      {
        id: 'UmG6yvkD0RJ3VFfc95b5',
        title: 'Certified Scrum Master (CSM)',
        category: 'Project Management',
        description: 'Learn Scrum methodologies and how to facilitate Scrum processes.',
        price: 129.99,
        duration: '60 minutes',
        questionCount: 50,
        difficulty: 'Intermediate',
        popularity: 4.7,
        passingScore: 70,
        purchaseDetails: {
          validityDays: 365,
          includedFeatures: [
            'Full exam simulation',
            'Practice questions',
            'Scrum case studies',
            'Performance analytics'
          ]
        },
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%234b9b4b"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3ECSM%3C/text%3E%3C/svg%3E'
      },
      {
        id: '2TRW5fp36eYK6C0pC0Vm',
        title: 'Cisco CCNA Certification',
        category: 'Networking',
        description: 'Validate your skills in network fundamentals, access, IP connectivity, and services.',
        price: 119.99,
        duration: '120 minutes',
        questionCount: 100,
        difficulty: 'Intermediate',
        popularity: 4.6,
        passingScore: 70,
        purchaseDetails: {
          validityDays: 365,
          includedFeatures: [
            'Full exam simulation',
            'Practice questions',
            'Network diagrams',
            'Performance analytics'
          ]
        },
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23005073"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3ECCNA%3C/text%3E%3C/svg%3E'
      },
      {
        id: 'UmG6yvkD0RJ3VFfc95b5',
        title: 'PMP Certification',
        category: 'Project Management',
        description: 'Demonstrate your expertise in project management processes and techniques.',
        price: 179.99,
        duration: '240 minutes',
        questionCount: 180,
        difficulty: 'Advanced',
        popularity: 4.9,
        passingScore: 70,
        purchaseDetails: {
          validityDays: 365,
          includedFeatures: [
            'Full exam simulation',
            'Practice questions',
            'PMBOK guide',
            'Performance analytics'
          ]
        },
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%23bd582c"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EPMP%3C/text%3E%3C/svg%3E'
      },
      {
        id: '7vNYHPzUNwgTeZyxMACt',
        title: 'Microsoft Azure Fundamentals (AZ-900)',
        category: 'Cloud',
        description: 'Learn cloud concepts, Azure services, security, privacy, and compliance.',
        price: 99.99,
        duration: '60 minutes',
        questionCount: 40,
        difficulty: 'Beginner',
        popularity: 4.5,
        passingScore: 70,
        purchaseDetails: {
          validityDays: 365,
          includedFeatures: [
            'Full exam simulation',
            'Practice questions',
            'Azure documentation',
            'Performance analytics'
          ]
        },
        thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"%3E%3Crect width="160" height="100" fill="%230078d4"/%3E%3Ctext x="80" y="50" font-family="Arial" font-size="18" text-anchor="middle" fill="white"%3EAZ-900%3C/text%3E%3C/svg%3E'
      }
    ];

    // Add each exam to the 'exams' collection with specified ID
    for (const examData of examsData) {
      const examId = examData.id;
      
      // Remove the id field as Firestore will use it as the document ID
      const { id, ...examWithoutId } = examData;
      
      // Add timestamps
      const examWithTimestamps = {
        ...examWithoutId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Use setDoc with a specific document ID instead of addDoc
      await setDoc(doc(db, 'exams', examId), examWithTimestamps);
      console.log(`Exam "${examData.title}" added with ID: ${examId}`);
      
      // Now add practice tests for this exam
      await migratePracticeTests(examId, examData.title);
    }
    
    console.log('Exams migration completed successfully!');
  } catch (error) {
    console.error('Error during exams migration:', error);
  }
};

const migratePracticeTests = async (examId, examTitle) => {
  try {
    console.log(`Adding practice tests for exam ID: ${examId}`);
    
    const difficultyLevels = ['Easy', 'Medium', 'Medium', 'Hard', 'Hard', 'Challenge'];
    
    // Create 6 practice tests for each exam
    for (let i = 1; i <= 6; i++) {
      const testData = {
        displayId: i,
        title: `Practice Test ${i}`,
        displayName: `${examTitle} - Practice Test ${i}`,
        description: `Comprehensive practice test designed to simulate the actual certification exam experience, with ${i === 6 ? 'challenging' : 'realistic'} questions.`,
        questionCount: i === 6 ? 75 : 60,
        timeLimit: i === 6 ? 90 : 60, // minutes
        difficulty: difficultyLevels[i-1],
        passingScore: 70,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add the practice test to the subcollection
      const testRef = await addDoc(collection(db, 'exams', examId, 'practiceTests'), testData);
      console.log(`  - Practice Test ${i} added with ID: ${testRef.id}`);
      
      // Now add questions for this practice test
      await migrateQuestions(examId, testRef.id, testData.difficulty, testData.questionCount);
    }
  } catch (error) {
    console.error(`Error adding practice tests for exam ${examId}:`, error);
  }
};

const migrateQuestions = async (examId, testId, difficulty, questionCount) => {
  try {
    console.log(`  - Adding ${questionCount} questions for test ID: ${testId}`);
    
    const categories = ['Network Security', 'Cloud Computing', 'Database Management', 'Software Development', 'IT Infrastructure'];
    const batchSize = 20; // Process in batches to avoid overloading Firestore
    
    // Create questions in batches
    for (let i = 0; i < questionCount; i += batchSize) {
      const batch = [];
      
      for (let j = 0; j < batchSize && i + j < questionCount; j++) {
        const questionNumber = i + j + 1;
        const category = categories[(questionNumber) % categories.length];
        
        const questionData = {
          sequence: questionNumber,
          text: `Question ${questionNumber}: In ${category}, what is the most effective approach to handle [specific scenario]?`,
          options: [
            { id: 'a', text: `Option A for question ${questionNumber}` },
            { id: 'b', text: `Option B for question ${questionNumber}` },
            { id: 'c', text: `Option C for question ${questionNumber}` },
            { id: 'd', text: `Option D for question ${questionNumber}` }
          ],
          correctAnswer: String.fromCharCode(97 + (questionNumber % 4)), // a, b, c, or d
          explanation: `Detailed explanation for question ${questionNumber}: The correct answer is ${String.fromCharCode(97 + (questionNumber % 4)).toUpperCase()} because it addresses the key requirements of the scenario. Options ${String.fromCharCode(97 + ((questionNumber+1) % 4)).toUpperCase()} and ${String.fromCharCode(97 + ((questionNumber+2) % 4)).toUpperCase()} are incorrect because they don't account for important factors like scalability and security. Option ${String.fromCharCode(97 + ((questionNumber+3) % 4)).toUpperCase()} might seem reasonable but has limitations in real-world applications.`,
          category: category,
          difficulty: questionNumber % 3 === 0 ? 'Hard' : (questionNumber % 2 === 0 ? 'Medium' : 'Easy'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.push(questionData);
      }
      
      // Add all questions in this batch
      for (const questionData of batch) {
        await addDoc(
          collection(db, 'exams', examId, 'practiceTests', testId, 'questions'), 
          questionData
        );
      }
      
      console.log(`    - Added questions ${i+1} to ${Math.min(i+batchSize, questionCount)}`);
    }
  } catch (error) {
    console.error(`Error adding questions for test ${testId}:`, error);
  }
};

// Execute the migration
migrateExamsData()
  .then(() => console.log('Migration script completed'))
  .catch(error => console.error('Migration failed:', error));