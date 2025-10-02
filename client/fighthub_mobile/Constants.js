export const ip = "http://10.50.107.251:5001";
const baseUrl = ip;
const response = {
  data: {
    profile_picture_url: "/images/profile.jpg",
  },
};

const picUrl = response.data.profile_picture_url
  ? `${baseUrl.replace(/\/$/, "")}${response.data.profile_picture_url}`
  : "";
