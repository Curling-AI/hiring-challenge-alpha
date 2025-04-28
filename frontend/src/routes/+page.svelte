<script>
    let userMessage = $state('');
    let reply = $state('');
    let files = $state([]);
    let sql_querys = $state([]);
    let web_searches = $state([]);
    let web_search_allowed = $state(false);
    let waiting = $state(false);

    

    async function sendMessage() {
        if (userMessage === '') {
            alert('Please enter a message.');
            return;
        }
        waiting = true;
        const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, web_search_allowed: web_search_allowed }),
        });
        const data = await res.json()
        .catch((error) => {
            console.error('Error:', error);
            alert('An error occurred while processing your request. Please try again.');
            waiting = false;
        });
        console.log(data);
        reply = data.reply.messages[data.reply.messages.length - 1].kwargs.content;
        files = data.reply.files;
        sql_querys = data.reply.sql_queries;
        web_searches = data.reply.web_search_results;
        waiting = false;
        }

    function resizeTextarea(textarea) {
        textarea.style.height = 'auto'; // reset height
        textarea.style.height = (textarea.scrollHeight<247)? `${textarea.scrollHeight}px` : '247px'; // set height to fit content
    }

</script>

<main>
    <h1>Multi-Source AI Agent</h1>
    <div class="description">
        <p>This is a multi-source AI agent that can answer questions based on the content of files and a databank.</p>
        <p>It can also perform web searches if allowed.</p>
        <p>Ex: What is the book The Wealth of Nations About?</p>
    </div>
    
    <div class="input_container">
        <div class="input_container_inner">
            <label class="web_search_allowed_container">
                <input type="checkbox" bind:checked={web_search_allowed} id="web_search_allowed" />
                <div class="web_search_allowed_input" class:checked={web_search_allowed}>
                    <span>
                        {web_search_allowed?  "Web Search Allowed" : "Allow Web Search"}
                    </span>
                </div>
            </label>
            <textarea class="message_input" bind:value={userMessage} placeholder="Type your message..." oninput={(e) => resizeTextarea(e.target)} ></textarea>
        </div>
        <button onclick={sendMessage}>Send</button>
    </div>

    {#if waiting || reply}
        <div class="response_container">
            {#if waiting}
                <div class="waiting">
                </div>
            {/if}
        
            {#if reply}
                <div class="reply">
                    <p>{reply}</p>
                </div>

                {#if files.length > 0}
                    <div class="reply_files">
                        <p>Read files:</p>
                        <ul>
                            {#each files as file}
                                <li>{file}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if sql_querys.length > 0}
                    <div class="reply_sql_querys">
                        <p>SQL Queries:</p>
                        <ul>
                            {#each sql_querys as sql_query}
                                <li>{sql_query.query}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}

                {#if web_searches.length > 0}
                    <div class="reply_web_searches">
                        <p>Links Used in Web Searches:</p>
                        <ul>
                            {#each web_searches as web_search}
                                <li><a href={'https://' + web_search} >{web_search}</a></li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}


</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
        font-family: 'Roboto', sans-serif;
		font-size: 16px;
		line-height: 1.5;
		color: #ffffff;
		background-color: #11101a;
        background: linear-gradient(0deg,#2d2d3f, #0a0a0f );
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		-webkit-text-size-adjust: 100%;
		-moz-text-size-adjust: 100%;
		-ms-text-size-adjust: 100%;
        background-attachment: fixed;

	}
	:global(html) {
		height: 100%;
	}


    :global(main) {
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100vh;
        padding: 20px;
    }

    h1 {
        font-family: 'Roboto', sans-serif, bold;
        font-weight: 900;
        text-decoration: underline;
        font-size: 3.5em;
        color: #af23d6;
        margin-bottom: 0;
    }

    .description {
        text-align: center;
        color: #e1d1e6;
        opacity: 0.8;
        font-size: 1.2em;

        p {
            margin: 10px 0;
        }
        margin-bottom: 4rem;
    }

    .input_container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20px;
        width: 90%;

        button {
            width: 100%;
            padding: 0.5rem;
            border-radius: 1rem;
            background-color: #af23d6;
            color: #fff;
            border: none;
            cursor: pointer;
            margin-top: 1.5rem;
            font-size: 1.2rem;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #9b1db0;
        }
    
        margin-top: 10px;
    }

    .input_container_inner {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0;
        height: auto;
        
        .message_input {
            margin: 0;
            width: 90%;
            font-size: 1.2rem;
            color: #ffffff;
            background-color: #22223b;
            border-radius: 1rem;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
            padding: 0.5rem;
            border: 3px solid #ccc;

            resize: none;
            transition: border-color 0.3s, background-color 0.3s;

            &:focus {
                outline: none;
                border-color: #999999;
                background-color: #343455;
            }
            &:hover {
                border-color: #999999;
            }

            &::-webkit-scrollbar {
                width: 0.5rem;
            }

            &::-webkit-scrollbar-thumb {
                background-color: #ccc;
                border-radius: 10px;
            }

            &::-webkit-scrollbar-thumb:hover {
                background-color: #ccc;
                cursor: pointer;
            }

            &::-webkit-scrollbar-track {
                opacity: 0;
            }
        }

        .web_search_allowed_container {

            height: 100%;
            width: 10%;
            display: flex;
            align-items: center;
            margin: 0;
            color: #6b6b6b;
            font-size: 1rem;
            padding: 0;

            input {
                display: none;
            }
        }

        .web_search_allowed_input {
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            background-color: #ccc;
            width: 100%;
            height: 100%;
            cursor: pointer;
            transition: background-color 0.3s;
            transition: color 0.3s;
            border-radius: 1rem;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            background-color:  #ccc;
            border-right: none;
            font-weight: bold;
            padding: 0.5rem;

            span {
                display: block;
                text-align: center;
                width: 100%;
            }

            &.checked {
                background-color: #af23d6;
                color: #fff;
            }

            &.checked:hover {
                background-color: #9b1db0;
            }

            &:hover {
                background-color: #999999;
            }

        }
    }

    .response_container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-evenly;
        margin-top: 3rem;
        width: auto;
        background-color: #11101a;
        border-radius: 1rem;
        border: 3px solid #ccc;
        padding: 1rem;

    }

    .waiting {
        
        border: 8px dotted #11101a; 
        border-top: 8px dotted #ccc; 
        border-radius: 50%; 
        width: 5rem;
        height: 5rem;
        animation: spin 1.5s linear infinite; 
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .reply {
        color: #e1d1e6;
        font-size: 1.2rem;
        text-align: center;
        width: 100%;
        padding: 1rem;
        margin: 0;
    }
    .reply p {
        margin: 0;
        padding: 0;
    }
    .reply p::first-letter {
        text-transform: uppercase;
    }

    .reply_files, .reply_sql_querys, .reply_web_searches {
        color: #e1d1e6;
        font-size: 1.2rem;
        width: 100%;
        padding: 1rem;
        margin: 0;

        p {
            margin: 0;
            padding: 0;
            justify-self: left;
            font-weight: bold;
        }
    }
    .reply_files ul, .reply_sql_querys ul, .reply_web_searches ul {
        width: 100%;
        list-style: disc;
        list-style-position: inside;
        justify-self: center;
        padding: 0;
        margin: 0;
    }

    .reply_files li, .reply_sql_querys li, .reply_web_searches li {
        font-size: 1rem;

        a {
            color: #af23d6;
            text-decoration: none;
        }
        a:hover {
            color: #9b1db0;
            text-decoration: underline;
        }
    }

</style>