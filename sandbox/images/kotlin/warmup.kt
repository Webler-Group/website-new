fun main() {
    val n = readln().trim().toInt()
    val xs = MutableList(n) { it * 2 }.filter { it % 3 == 0 }.map { "$it" }
    println(xs.joinToString(", "))
}
