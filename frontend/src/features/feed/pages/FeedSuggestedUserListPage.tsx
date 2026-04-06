import { useCallback, useEffect, useState } from "react";
import { Container, Row, Col, Form, Button, Card, InputGroup } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import { FeedSuggestedUserData } from "../types";
import { UserMinimal } from "../../profile/types";



export default function FeedSuggestedUserListPage() {
    const { sendJsonRequest } = useApi();
    const [suggestedUsers, setSuggestedUsers] = useState<UserMinimal[]>([]);
    const [query, setQuery] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);


    const showNotification = useCallback((type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);


    const handleFollow = async (user: UserMinimal, btn: HTMLButtonElement) => {
        const result = await sendJsonRequest(`/Profile/Follow`, "POST", { userId: user.id });
        if (result.success) {
			btn.disabled = true;
        } else {
            showNotification("error", result.error?.[0].message ?? `Unable to follow ${name}`);
        }
    };

  
    const fetchSuggested = async () => {
        setLoading(true);
        const result = await sendJsonRequest<FeedSuggestedUserData>("/Feed/Users/Suggestion", "POST");
    
        if (result.data) {
            setSuggestedUsers(result.data.users);
        }
    
        setLoading(false);
    };


    const searchUsers = async () => {
        // try {
        //   setLoading(true);
        //   const res = await axios.get(`/api/users?q=${query}&limit=30`);
        //   setUsers(res.data.users);
        // } catch (err) {
        //   console.error(err);
        // } finally {
        //   setLoading(false);
        // }
    };

    
    const handleInvite = async () => {
        const link = `www.weblercodes.com`;
        await navigator.clipboard.writeText(link);
		alert("Link copied");
        // alert("Profile link copied!");
    };


    useEffect(() => {
        fetchSuggested();
    }, []);


  return (
    <Container className="py-4" style={{ maxWidth: "700px" }}>
      
      <Row className="mb-3">
        <Col md={8}>
          <InputGroup>
            <Form.Control
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="dark" onClick={searchUsers}>
              Search
            </Button>
          </InputGroup>
        </Col>

        <Col md={4}>
          <Button variant="outline-primary" className="w-100" onClick={handleInvite}>
            Invite Friend
          </Button>
        </Col>
      </Row>

      
      <div>
        {suggestedUsers.map((user, index) => (
          <Card key={index} className="mb-2 shadow-sm border-0">
            <Card.Body className="d-flex align-items-center justify-content-between">

              <div className="d-flex align-items-center gap-3">
                <img
                  src={user.avatarUrl || "/default-avatar.png"}
                  alt=""
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    objectFit: "cover"
                  }}
                />

                <div>
                  <div className="fw-bold">{user.name}</div>
                  <small className="text-muted">
                    <b>{user.followerCount}</b> Followers • Level <b>{user.level}</b>
                  </small>
                </div>
              </div>
				
			{
			
			<Button size="sm" variant="dark" onClick={(e)=>handleFollow(user, e.target as HTMLButtonElement)}>
				Follow
			</Button>
			}

            </Card.Body>
          </Card>
        ))}

        {loading && <p className="text-center mt-3">Loading...</p>}

        {!loading && suggestedUsers.length === 0 && (
          <p className="text-center mt-3 text-muted">No users found</p>
        )}
      </div>

    </Container>
  );
}