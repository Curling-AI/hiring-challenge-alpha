const messagesContainer = document.querySelector('#messages');

export function addMessage(user, text, isError, isLoading = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message${isLoading ? ' loading' : ''}`;

  if (isError) {
    messageDiv.classList.add('error');
  } else if (user === 'You') {
    messageDiv.classList.add('user-message');
  } else if (user === 'AI') {
    messageDiv.classList.add('ai-message');
  }

  const senderSpan = document.createElement('span');
  senderSpan.className = 'sender';
  senderSpan.textContent = `${user}:`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (window.marked) {
    contentDiv.innerHTML = window.marked.parse(text);
  } else {
    contentDiv.textContent = text;
  }

  messageDiv.appendChild(senderSpan);
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

export function addApproval(onclick, command) {
  const approvalDiv = document.createElement('div');
  approvalDiv.className = 'approval';

  const spanText = document.createElement('span');
  spanText.className = 'spanText';
  spanText.textContent = 'What will you do with command';

  const spanCommand = document.createElement('span');
  spanCommand.className = 'spanCommmand';
  spanCommand.textContent = command;

  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'buttonsDiv';

  const approveBtn = document.createElement('button');
  approveBtn.className = 'approve-button';
  approveBtn.textContent = 'Approve';

  const rejectBtn = document.createElement('button');
  rejectBtn.className = 'reject-button';
  rejectBtn.textContent = 'Reject';

  approveBtn.onclick = () => {
    approveBtn.disabled = true;
    rejectBtn.disabled = true;

    rejectBtn.classList.add('processed');
    approveBtn.innerHTML = '<div class="spinner small"></div>';

    onclick(true);
  };

  rejectBtn.onclick = () => {
    approveBtn.disabled = true;
    rejectBtn.disabled = true;

    approveBtn.classList.add('processed');
    rejectBtn.innerHTML = '<div class="spinner small"></div>';

    onclick(false);
  };

  buttonsDiv.appendChild(approveBtn);
  buttonsDiv.appendChild(rejectBtn);

  approvalDiv.appendChild(spanText);
  approvalDiv.appendChild(spanCommand);
  approvalDiv.appendChild(buttonsDiv);

  messagesContainer.appendChild(approvalDiv);
}