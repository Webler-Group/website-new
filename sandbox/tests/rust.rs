use std::io::stdin;
fn main() {
    let mut name = String::new();
    stdin().read_line(&mut name).unwrap();
    println!("hello {}", name.trim());
}
