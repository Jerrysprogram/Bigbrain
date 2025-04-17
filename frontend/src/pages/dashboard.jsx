import React from 'react';
import { List, Card, Avatar } from 'antd';
import { Link } from 'react-router-dom';

const gameData = [
  {
    id: 1,
    title: 'Math Challenge',
    description: 'Test your math skills',
    cover: 'https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png',
    avatar: 'https://api.dicebear.com/7.x/miniavs/svg?seed=1',
  },
];

export default function Dashboard() {
  return (
    <div style={{ 
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1>Game List</h1>
      <List
        grid={{
          gutter: 16,
          xs: 1,
          sm: 1,
          md: 1,
          lg: 1,
          xl: 1,
          xxl: 1,
        }}
        dataSource={gameData}
        renderItem={(item) => (
          <List.Item>
            <Card
              hoverable
              style={{ width: '300px', margin: '0 auto' }}
              cover={
                <img
                  alt={item.title}
                  src={item.cover}
                  style={{ height: '200px', objectFit: 'cover' }}
                />
              }
            >
              <Card.Meta
                avatar={<Avatar src={item.avatar} />}
                title={<Link to="/games">{item.title}</Link>}
                description={item.description}
              />
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
