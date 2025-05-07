import { addApproval, addMessage } from './ui.js';

//improvements:
// 1. use socket.io in the server and client to avoid using params to control "event types"
// this would really make the code cleaner
// 2. add a transpiler to use Typescript

export function setupSocket() {
  const socket = new WebSocket(`ws://${window.location.host}/api/v1/talkAi`);

  socket.addEventListener('message', (event) => {
    try {
      const jsonData = JSON.parse(event.data);
      const loadingMessages = document.querySelectorAll('.loading');
      loadingMessages.forEach(msg => msg.remove());
      
      sendButton.disabled = false;
      messageInput.disabled = false;

      if (jsonData.type === 'error') {
        addMessage('System', jsonData.content, true);
      } else if (jsonData.type === 'approvalRequest') {
        addApproval((isApproval) => handleAproval(socket, isApproval), jsonData.content)
      }else if (jsonData.type === 'approvalResponse') {
        if(jsonData.content === 'approved') {
          const selectAllApproved = document.querySelectorAll('.approve-button')
          selectAllApproved[selectAllApproved.length - 1].innerHTML = 'Approved 👍';
        }else if (jsonData.content === 'denied') {
          const selectedAllRejected = document.querySelectorAll('.reject-button')
          selectedAllRejected[selectedAllRejected.length - 1].innerHTML = 'Denied 👎';
        }
      }else {
        addMessage('AI', jsonData.content);
      }
    } catch (e) {
      addMessage('System', "Unable to read server response.", true);
    }
  });

  socket.addEventListener('close', () => {
    addMessage('System', 'Connection closed. Please refresh the page.', true);
  });
  
  socket.addEventListener('error', () => {
    addMessage('System', 'Connection error. Please refresh the page.', true);
  });

  handleSubmit(socket);

  return socket;
}


const handleSubmit = (socket) => {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  
  const sendMessage = () => {
    const message = messageInput.value.trim();
    if (message) {
      sendButton.disabled = true;
      messageInput.disabled = true;
      
      socket.send(JSON.stringify({ content: message, type: 'user'}));
      addMessage('You', message);
      messageInput.value = '';
      
      addMessage('AI', 'Processing your request...', false, true);
    }
  };

  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });
};

const handleAproval = (socket, isAccept) => {
  socket.send(JSON.stringify({
    type: "approval",
    content: isAccept
  }));
}