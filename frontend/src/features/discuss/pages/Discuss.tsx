import { Button, Container, Form, FormControl, Pagination } from "react-bootstrap";
import Header from "../../../layouts/Header";

const Discuss = () => {

    let active = 2;
    let items = [];
    for (let number = 1; number <= 5; number++) {
        items.push(
            <Pagination.Item key={number} active={number === active}>
                {number}
            </Pagination.Item>,
        );
    }

    return (
        <>
            <Header />
            <Container>
                <div className="d-block d-lg-flex p-4">
                    <div className="wb-discuss-questions-list-page__questions-section">
                        <h2>Q&A Discussions</h2>
                        <Form className="d-flex mt-4">
                            <FormControl type="search" placeholder="Search..." />
                            <Button className="ms-2" type="submit">Search</Button>
                        </Form>
                        <div className="mt-4 row justify-content-between">
                            <div className="col-6 col-sm-4">
                                <Form.Select>
                                    <option value="1">Most Recent</option>
                                    <option value="2">Unanswered</option>
                                    <option value="3">My Questions</option>
                                </Form.Select>
                            </div>
                            <Button className="col-6 col-sm-4">Ask a question</Button>
                        </div>
                        <div className="my-4">

                        </div>
                        <div>
                            <Pagination>
                                {items}
                            </Pagination>
                        </div>
                    </div>
                    <div className="wb-discuss-hot-today">
                        <h2>Hot today</h2>
                    </div>
                </div>
            </Container>
        </>
    )
}

export default Discuss;