// import axios from "axios";

// const axiosInstance = axios.create({
//   baseURL: "http://localhost:5000/api",
// });

// export default axiosInstance;


import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://realtime-todo.onrender.com/api", // ✅ your backend URL + /api
  withCredentials: false, // or true if using cookies
});

export default axiosInstance;
