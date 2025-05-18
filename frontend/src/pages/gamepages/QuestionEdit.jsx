import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  message,
  Space,
  Checkbox,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import requests from "../../utills/requests";
import './QuestionEdit.css';

const { Option } = Select;

export default function QuestionEdit() {
  const { gameId, questionId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // Load game and question information
  useEffect(() => {
    async function load() {
      try {
        const { games } = await requests.get("/admin/games");
        const g = games.find((g) => g.id === +gameId);
        if (!g) throw new Error("Game not found");
        setGame(g);
        const q = g.questions.find((q) => q.id === +questionId);
        if (!q) throw new Error("Question not found");
        // Initialize form fields
        form.setFieldsValue({
          type: q.type,
          text: q.text,
          duration: q.duration,
          points: q.points,
          answers: (q.answers || []).map((a) => ({
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        });
        // Handle media (image or video)
        if (q.image) {
          setFileList([{ uid: "-1", url: q.image, thumbUrl: q.image }]);
        }
        if (q.video) setYoutubeUrl(q.video);
      } catch (err) {
        message.error(`Load failed: ${err.message}`);
      }
    }
    load();
  }, [gameId, questionId]);

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      // Build updated question object
      const updated = {
        id: +questionId,
        type: vals.type,
        text: vals.text,
        duration: vals.duration,
        points: vals.points,
        image: fileList[0]?.thumbUrl || fileList[0]?.url || null,
        video: youtubeUrl || null,
        answers: vals.answers.map((a) => ({
          text: a.text,
          isCorrect: a.isCorrect,
        })),
        correctAnswers: vals.answers
          .filter((a) => a.isCorrect)
          .map((a) => a.text),
      };
      // Update question list
      const newQuestions = game.questions.map((q) =>
        q.id === updated.id ? updated : q,
      );
      // Update game entry in all games array
      const all = await requests.get("/admin/games").then((r) => r.games);
      const updatedAll = all.map((g) =>
        g.id === +gameId ? { ...g, questions: newQuestions } : g,
      );
      await requests.put("/admin/games", { games: updatedAll });
      message.success("Question saved successfully");
      navigate(`/game/${gameId}`);
    } catch (err) {
      message.error(`Save failed: ${err.message}`);
    }
  };

  if (!game) {
    return <div>Loading...</div>;
  }
  return (
    <div className="questionEditContainer">
      <Button
        onClick={() => navigate(`/game/${gameId}`)}
        className="backButton"
      >
        ← Back to Question List
      </Button>
      <h2>Edit Question #{questionId}</h2>
      <Form form={form} layout="vertical">
        {/* question type */}
        <Form.Item
          name="type"
          label="Question Type"
          rules={[{ required: true, message: "Please select question type" }]}
        >
          <Select placeholder="Select question type">
            <Option value="single">Single Choice</Option>
            <Option value="multiple">Multiple Choice</Option>
            <Option value="judgement">Judgement</Option>
          </Select>
        </Form.Item>
        {/* question text */}
        <Form.Item
          name="text"
          label="Question Text"
          rules={[{ required: true, message: "Please enter question text" }]}
        >
          <Input.TextArea rows={3} placeholder="Enter question text" />
        </Form.Item>
        {/* question duration */}
        <Form.Item
          name="duration"
          label="Time Limit (sec)"
          rules={[{ required: true, message: "Please enter time limit" }]}
        >
          <InputNumber min={1} placeholder="Enter time limit (sec)" />
        </Form.Item>
        {/* points */}
        <Form.Item
          name="points"
          label="Points"
          rules={[{ required: true, message: "Please enter points" }]}
        >
          <InputNumber min={1} placeholder="Enter points" />
        </Form.Item>
        {/* media */}
        <Form.Item
          label="Media"
          help="Optional: upload image or provide YouTube URL"
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: newList }) => setFileList(newList)}
              beforeUpload={(file) => {
                const isImg = file.type.startsWith("image/");
                if (!isImg) message.error("Please upload image files only");
                return false;
              }}
            >
              {fileList.length < 1 && (
                <div>
                  <PlusOutlined />
                  <div>Upload</div>
                </div>
              )}
            </Upload>
            <Input
              placeholder="Or enter YouTube URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </Space>
        </Form.Item>
        {/* answers */}
        <Form.List name="answers">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space
                  key={field.key}
                  align="start"
                  className="answerSpace"
                >
                  <Form.Item
                    key={`${field.key}-text`}
                    name={[field.name, "text"]}
                    fieldKey={[field.fieldKey, "text"]}
                    rules={[
                      { required: true, message: "Please enter an answer" },
                    ]}
                  >
                    <Input placeholder="Answer text" />
                  </Form.Item>
                  <Form.Item
                    key={`${field.key}-correct`}
                    name={[field.name, "isCorrect"]}
                    fieldKey={[field.fieldKey, "isCorrect"]}
                    valuePropName="checked"
                  >
                    <Checkbox>Correct Answer</Checkbox>
                  </Form.Item>
                  <DeleteOutlined
                    onClick={() => remove(field.name)}
                    style={{ fontSize: 20, color: "red" }}
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
        {/* save button */}
        <Form.Item>
          <Button type="primary" onClick={handleSave} className="saveButton">
            Save Question
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
