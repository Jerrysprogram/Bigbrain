import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Games() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);

  // 打印gameId，帮助调试
  console.log('Current gameId:', gameId);

  // 使用从requests.js获取的游戏数据
  useEffect(() => {
    if (gameId) {  // 确保gameId存在
      fetch(`https://jsonplaceholder.typicode.com/users/${gameId}`)
        .then(response => response.json())
        .then(data => setGame(data))
        .catch(error => console.error('Error fetching game:', error));
    }
  }, [gameId]);

  if (!game) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Games: {game?.name || ''} (ID: {gameId})</h1>
    </div>
  );
}
