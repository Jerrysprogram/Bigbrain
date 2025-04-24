import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import requests from "../../utills/requests";

export default function Games() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);

  // Print gameId for debugging
  console.log("Current gameId:", gameId);

  // Use encapsulated GET method to fetch game details
  useEffect(() => {
    if (gameId) {
      // Ensure gameId exists
      // Use GET method from requests utility to call backend API
      requests.get(`/games/${gameId}`).then((data) => setGame(data));
    }
  }, [gameId]);

  if (!game) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>
        Games: {game?.name || ""} (ID: {gameId})
      </h1>
    </div>
  );
}
