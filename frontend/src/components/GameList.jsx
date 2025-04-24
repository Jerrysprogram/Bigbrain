import { List, Card, Avatar, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, UserOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

/**
 * GameList component
 * @param {Array} games List of game objects
 * @param {func} onEdit Callback when editing a game
 * @param {func} onDelete Callback when deleting a game
 */
export default function GameList({ games, onEdit, onDelete }) {
  return (
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
      dataSource={games}
      renderItem={(game) => (
        <List.Item>
          <Card
            hoverable
            style={{ width: 300, margin: "0 auto" }}
            cover={
              <img
                alt={game.name}
                src={game.thumbnail}
                style={{ height: 200, objectFit: "cover" }}
              />
            }
          >
            <Card.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={<Link to={`/games/${game.id}`}>{game.name}</Link>}
              description={
                game.createdAt
                  ? new Date(game.createdAt).toLocaleString()
                  : game.description
              }
            />
            <div style={{ textAlign: "right", paddingTop: 8 }}>
              <EditOutlined
                style={{ marginRight: 12 }}
                onClick={() => onEdit(game)}
              />
              <Popconfirm
                title="Are you sure to delete this game?"
                onConfirm={() => onDelete(game.id)}
                okText="Yes"
                cancelText="No"
              >
                <DeleteOutlined style={{ color: "red" }} />
              </Popconfirm>
            </div>
          </Card>
        </List.Item>
      )}
    />
  );
}
