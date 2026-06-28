const TODO_BACKEND_URL = process.env.TODO_BACKEND_URL;
const WIKIPEDIA_RANDOM_URL =
  process.env.WIKIPEDIA_RANDOM_URL || "https://en.wikipedia.org/wiki/Special:Random";

if (!TODO_BACKEND_URL) {
  throw new Error("Missing required configuration: TODO_BACKEND_URL");
}

const getRandomWikipediaUrl = async () => {
  const response = await fetch(WIKIPEDIA_RANDOM_URL, {
    method: "GET",
    redirect: "manual"
  });

  const location = response.headers.get("location");

  if (location) {
    return location.startsWith("http")
      ? location
      : `https://en.wikipedia.org${location}`;
  }

  return response.url;
};

const createTodo = async (content) => {
  const response = await fetch(`${TODO_BACKEND_URL}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Todo creation failed: ${response.status} ${body}`);
  }
};

const main = async () => {
  const articleUrl = await getRandomWikipediaUrl();
  const todo = `Read ${articleUrl}`;

  await createTodo(todo);

  console.log(`Created todo: ${todo}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});