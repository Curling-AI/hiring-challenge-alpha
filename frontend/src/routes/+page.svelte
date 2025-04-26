<script>
    let userMessage = $state('');
    let reply = $state('');

    async function sendMessage() {
        const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
        });
        const data = await res.json();
        console.log(data);
        reply = data.reply.messages[data.reply.messages.length - 1].kwargs.content;
        }

</script>

<main>
    <h1>Multi-Source AI Agent</h1>
    <p>This agent will answer your question based on the content of the files and databank given.</p>
    <p>Ex: What is the book The Wealth of Nations About?</p>
    
    <input bind:value={userMessage} placeholder="Type your message..." />
    <button onclick={sendMessage}>Send</button>

    {#if reply}
        <div class="reply">
            <h2>Reply:</h2>
            <p>{reply}</p>
        </div>
    {/if}
</main>
