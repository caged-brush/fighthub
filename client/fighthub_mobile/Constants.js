export const API_URL = "https://fighthub.onrender.com";
const baseUrl = API_URL;
const response = {
  data: {
    profile_picture_url: "/images/profile.jpg",
  },
};

const picUrl = response.data.profile_picture_url
  ? `${baseUrl.replace(/\/$/, "")}${response.data.profile_picture_url}`
  : "";
