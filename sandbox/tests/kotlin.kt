fun main() {
    val name = readln()
    val nums = listOf(3, 1, 2).sorted()
    println("hello $name ${nums.joinToString()} ${KotlinVersion.CURRENT}")
}
