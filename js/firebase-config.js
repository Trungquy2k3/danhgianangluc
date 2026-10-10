// ====== CẤU HÌNH FIREBASE (copy từ Firebase Console > Project settings > Your apps) ======
const firebaseConfig = {
    apiKey: "AIzaSyCSuKDfXr-TNuZz440zt0GEO8xSe7VTlvA",
    authDomain: "quiz-master-42ee3.firebaseapp.com",
    projectId: "quiz-master-42ee3",
    appId: "1:667262431849:web:49fd4bcc02ae36daa4a8f8"
};
firebase.initializeApp(firebaseConfig);
const fbDb = firebase.firestore();
