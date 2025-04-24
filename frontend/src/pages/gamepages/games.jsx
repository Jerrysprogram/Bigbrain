import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import requests from "../../utills/requests";

export default function Games() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);

  // 打印gameId，帮助调试
  console.log("Current gameId:", gameId);

  // 使用封装的 GET 方法获取游戏详情
  useEffect(() => {
    if (gameId) {
      // 确保 gameId 存在
      // 使用requests工具中的GET方法请求后端接口
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
