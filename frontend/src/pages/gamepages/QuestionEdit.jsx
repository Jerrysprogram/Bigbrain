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
        if (!g) throw new Error('游戏未找到');
        setGame(g);
        const q = g.questions.find(q => q.id === +questionId);
        if (!q) throw new Error('题目未找到');
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
        message.error(`加载失败: ${err.message}`);
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
      message.success('题目已保存');
      navigate(`/game/${gameId}`);
    } catch (err) {
      message.error(`保存失败: ${err.message}`);
    }
  };

  if (!game) {
    return <div>加载中…</div>;
  }
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Button onClick={() => navigate(`/game/${gameId}`)} style={{ marginBottom: 16 }}>
        ← 返回题目列表
      </Button>
      <h2>编辑题目 #{questionId}</h2>
      <Form form={form} layout="vertical">
        <Form.Item name="type" label="题目类型" rules={[{ required: true, message: '请选择题型' }]}>
          <Select placeholder="选择题型">
            <Option value="single">单选题</Option>
            <Option value="multiple">多选题</Option>
            <Option value="judgement">判断题</Option>
          </Select>
        </Form.Item>
        <Form.Item name="text" label="题干" rules={[{ required: true, message: '请输入题干' }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="duration" label="答题时限 (秒)" rules={[{ required: true, message: '请输入时限' }]}>
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item name="points" label="分值" rules={[{ required: true, message: '请输入分值' }]}>
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item label="媒体" help="可选上传图片或填写 YouTube 链接">
          <Tabs defaultActiveKey="image">
            <TabPane tab="图片" key="image">
              <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={({ fileList: newList }) => setFileList(newList)}
                beforeUpload={file => {
                  const isImg = file.type.startsWith('image/');
                  if (!isImg) message.error('只支持图片');
                  return false;
                }}
              >
                {fileList.length < 1 && <div><PlusOutlined /><div>上传图片</div></div>}
              </Upload>
            </TabPane>
            <TabPane tab="YouTube" key="video">
              <Input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="输入 YouTube 链接"
              />
            </TabPane>
          </Tabs>
        </Form.Item>
        <Form.List name="answers" initialValue={game.questions.find(q => q.id === +questionId).answers}>
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, idx) => (
                <Space key={field.key} align="start" style={{ display: 'flex', marginBottom: 8 }}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'text']}
                    fieldKey={[field.fieldKey, 'text']}
                    rules={[{ required: true, message: '请输入答案' }]}
                  >
                    <Input placeholder={`答案 ${idx + 1}`} />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'isCorrect']}
                    fieldKey={[field.fieldKey, 'isCorrect']}
                    valuePropName="checked"
                  >
                    <Checkbox>正确答案</Checkbox>
                  </Form.Item>
                  <DeleteOutlined onClick={() => remove(field.name)} style={{ fontSize: 20, color: 'red' }} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  disabled={fields.length >= 6}
                  icon={<PlusOutlined />}
                >
                  添加答案
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Button type="primary" onClick={handleSave} style={{ marginTop: 16 }}>
            保存题目
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}