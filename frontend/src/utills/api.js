export async function getGameById(id) {
  const { games } = await requests.get("/admin/games");
  return games.find((g) => g.id === +id);
}
