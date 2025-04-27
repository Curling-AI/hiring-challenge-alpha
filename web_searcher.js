import { exec } from 'node:child_process';
import { JSDOM } from 'jsdom';

export async function getWebSearchResult(query) {
    const link = await new Promise((resolve, reject) => {
        const command = `curl -L -s "https://duckduckgo.com/html/?q=${query.replaceAll(' ','+')}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`Error: ${stderr}`);
                reject(stderr);
                return;
            }
            const doc = new JSDOM(stdout).window.document;
            const link = doc.getElementsByClassName('result__url').item(0)?.textContent.trim();
            resolve(link);
        });
    });
    if (!link) {
        return null;
    }
    
    const result = await new Promise((resolve, reject) => {
        const command = `curl -L -s "${link}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`Error: ${stderr}`);
                reject(stderr);
                return;
            }
            const doc = new JSDOM(stdout).window.document;
            let content = ''
            doc.body.querySelectorAll('p, h1, h2, h3, li').forEach((el) => {
                if (el.textContent?.trim().length > 0) {
                    content += el.textContent.trim() + '\n';
                }
            });
            resolve({
                link: link,
                content: content.slice(0, 4000),
            });
        });
    });
    return result;
}

