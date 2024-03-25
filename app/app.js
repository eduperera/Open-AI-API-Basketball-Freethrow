document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("upload-form");
    const openai_api_key = "Open API"

    const feedback_prompt = `
    Analyze the provided key frames of a basketball player's free-throw attempt, focusing on the player's stance, arm angle, follow-through, and other relevant mechanics. Consider the fluidity of the motion, the alignment of the body, and the consistency of the player's technique across multiple attempts. Identify and highlight strengths in the player's current free-throw technique, such as correct posture, proper alignment, and effective follow-through. Also, pinpoint areas for improvement and provide specific, actionable advice on how to address these. Suggestions could include adjustments to the player's stance for better balance, modifications to the arm angle for optimal shooting trajectory, and enhancements to the follow-through for improved accuracy and consistency. Offer this feedback in a manner that is positive, encouraging, and constructive, aiming to motivate the player to incorporate these insights into their practice routine. Include examples of drills or exercises that could help the player work on the identified areas for improvement. Your analysis should be comprehensive, considering the complexity of the shooting motion and the individual player's style, and should aim to foster a growth mindset, emphasizing progress and the potential for improvement through dedicated practice.
    `
    const aggregator_prompt = `
    Summarize the following feedback on how a user can improve their basketball free throw into bullet-point order.
    Respond in HTML rich text.
    {{ text }}
    `

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        document.getElementById("preview-loader").style.display = "initial";

        let images = [];
        let returns = [];
        let canvas = document.createElement("canvas");
        let video = document.getElementById("preview-video");

        if (form.uploadFormChoose.files && form.uploadFormChoose.files[0]) {
            let reader = new FileReader();
            reader.onload = function(e) {
                video.src = e.target.result;
                video.load();
            }
            reader.readAsDataURL(form.uploadFormChoose.files[0]);
        }

        video.onloadedmetadata = async function () {
            video.muted = true


            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            let ctx = canvas.getContext('2d');
            let interval = setInterval(() => {
                if (video.paused || video.ended) {
                    clearInterval(interval);
                    return;
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                images.push(canvas.toDataURL());
                console.log(canvas.toDataURL())
            }, 2000);

            video.onended = async function () {
                for (var i = 0; i < images.length; i++) {
                    f = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${openai_api_key}`
                        },
                        body: JSON.stringify({
                            "model": "gpt-4-vision-preview",
                            "messages": [
                              {
                                "role": "system",
                                "content": [
                                  {
                                    "type": "text",
                                    "text": feedback_prompt
                                  },
                                  {
                                    "type": "image_url",
                                    "image_url": {
                                      "url": images[i]
                                    }
                                  }
                                ]
                              }
                            ],
                            "max_tokens": 300
                        })
                    })
                    f = await f.json()
                    returns.push(f["choices"][0].message.content)
                }

                aggregator_string = returns.join("\n")
                console.log(aggregator_string)
                f = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${openai_api_key}`
                    },
                    body: JSON.stringify({
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {
                                "role": "system",
                                "content": aggregator_prompt.replace("{{ text }}", aggregator_string)
                            }
                        ]
                    })
                })
                f = await f.json()
                document.getElementById("feedback-text").innerHTML = `<h2>Feedback</h2<${f["choices"][0].message.content.replace("\n", "<br>")}`
                document.getElementById("feedback-text").style.display = "initial"
                document.getElementById("feedback-skeleton").style.display = "none"
                document.getElementById("preview-loader").style.display = "none";
                document.getElementById("preview-skeleton").style.display = "none"
                document.getElementById("preview-video").style.display = "initial"
            };
            video.play();
        };
    });
});$