import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  Tabs,
  Checkbox,
  Space,
  Button,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import requests from '../../utills/requests';

const { TabPane } = Tabs;
const { Option } = Select;

export default function QuestionEdit() {
  const { gameId, questionId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');

  // 加载游戏和题目信息
  useEffect(() => {
    async function load() {
      try {
        const { games } = await requests.get('/admin/games');
        const g = games.find(g => g.id === +gameId);
        if (!g) throw new Error('Game not found');
        setGame(g);
        const q = g.questions.find(q => q.id === +questionId);
        if (!q) throw new Error('Question not found');
        // 初始化 form
        form.setFieldsValue({
          type: q.type,
          text: q.text,
          duration: q.duration,
          points: q.points,
          answers: (q.answers || []).map(a => ({ text: a.text, isCorrect: a.isCorrect })),
        });
        // 媒体
        if (q.image) {
          setFileList([{ uid: '-1', url: q.image, thumbUrl: q.image }]);
        }
        if (q.video) setVideoUrl(q.video);
      } catch (err) {
        message.error(`Load failed: ${err.message}`);
      }
    }
    load();
  }, [gameId, questionId]);

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      // 构建更新后的题目对象
      const updated = {
        id: +questionId,
        type: vals.type,
        text: vals.text,
        duration: vals.duration,
        points: vals.points,
        image: fileList[0]?.thumbUrl || fileList[0]?.url || null,
        video: videoUrl || null,
        answers: vals.answers.map(a => ({ text: a.text, isCorrect: a.isCorrect })),
      };
      // 更新题目列表
      const newQuestions = game.questions.map(q =>
        q.id === updated.id ? updated : q
      );
      // 更新游戏在所有游戏数组中的条目
      const all = await requests.get('/admin/games').then(r => r.games);
      const updatedAll = all.map(g =>
        g.id === +gameId ? { ...g, questions: newQuestions } : g
      );
      await requests.put('/admin/games', { games: updatedAll });
      message.success('Question saved successfully');
      navigate(`/game/${gameId}`);
    } catch (err) {
      message.error(`Save failed: ${err.message}`);
    }
  };

  if (!game) {
    return <div>Loading...</div>;
  }
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Button onClick={() => navigate(`/game/${gameId}`)} style={{ marginBottom: 16 }}>
        ← Back to Question List
      </Button>
      <h2>Edit Question #{questionId}</h2>
      <Form form={form} layout="vertical">
        {/* 题目类型 */}
        <Form.Item name="type" label="Question Type" rules={[{ required: true, message: 'Please select question type' }]}>
          <Select placeholder="Select question type">
            <Option value="single">Single Choice</Option>
            <Option value="multiple">Multiple Choice</Option>
            <Option value="judgement">Judgement</Option>
          </Select>
        </Form.Item>
        {/* 题干 */}
        <Form.Item name="text" label="Question Text" rules={[{ required: true, message: 'Please enter question text' }]}>
          <Input.TextArea rows={3} placeholder="Enter question text" />
        </Form.Item>
        {/* 答题时限 */}
        <Form.Item name="duration" label="Time Limit (sec)" rules={[{ required: true, message: 'Please enter time limit' }]}>
          <InputNumber min={1} placeholder="Enter time limit (sec)" />
        </Form.Item>
        {/* 分值 */}
        <Form.Item name="points" label="Points" rules={[{ required: true, message: 'Please enter points' }]}>
          <InputNumber min={1} placeholder="Enter points" />
        </Form.Item>
        {/* 媒体 */}
        <Form.Item label="Media" help="Optional: upload image or provide YouTube URL">
          <Tabs defaultActiveKey="image">
            <TabPane tab="Image" key="image">
              <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={({ fileList: newList }) => setFileList(newList)}
                beforeUpload={file => {
                  const isImg = file.type.startsWith('image/');
                  if (!isImg) message.error('Only images supported');
                  return false;
                }}
              >
                {fileList.length < 1 && <div><PlusOutlined /><div>Upload Image</div></div>}
              </Upload>
            </TabPane>
            <TabPane tab="YouTube" key="video">
              <Input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="Enter YouTube URL"
              />
            </TabPane>
          </Tabs>
        </Form.Item>
        {/* 答案选项 */}
        <Form.List
          name="answers"
          initialValue={game.questions.find(q => q.id === +questionId).answers}
        >
          {(fields, { add, remove }) => (
            <>
              {fields.map(field => (
                <Space
                  key={field.key}
                  align="start"
                  style={{ display: 'flex', marginBottom: 8 }}
                >
                  <Form.Item
                    key={`${field.key}-text`}
                    name={[field.name, 'text']}
                    fieldKey={[field.fieldKey, 'text']}
                    rules={[{ required: true, message: 'Please enter an answer' }]}
                  >
                    <Input placeholder="Answer text" />
                  </Form.Item>
                  <Form.Item
                    key={`${field.key}-correct`}
                    name={[field.name, 'isCorrect']}
                    fieldKey={[field.fieldKey, 'isCorrect']}
                    valuePropName="checked"
                  >
                    <Checkbox>Correct Answer</Checkbox>
                  </Form.Item>
                  <DeleteOutlined
                    onClick={() => remove(field.name)}
                    style={{ fontSize: 20, color: 'red' }}
                  />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  disabled={fields.length >= 6}
                  icon={<PlusOutlined />}
                >
                  Add Answer
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        {/* 保存按钮 */}
        <Form.Item>
          <Button type="primary" onClick={handleSave} style={{ marginTop: 16 }}>
            Save Question
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}