export function ifLogin() {
  return !!localStorage.getItem("token");
}
