import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View, Button } from "react-native";
import { API_URL } from "../Constants";

const videoSource = `${API_URL}/uploads/1742839961029.mp4`;

export default function VideoScreen() {
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
  });

  return (
    <View style={styles.contentContainer}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      <View style={styles.controlsContainer}>
        <Button
          title={player.playing ? "Pause" : "Play"}
          onPress={() => {
            player.playing ? player.pause() : player.play();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: 350,
    height: 275,
  },
  controlsContainer: {
    padding: 10,
  },
});
